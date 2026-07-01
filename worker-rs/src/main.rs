mod ai;
mod app_state;
mod auth;
mod cache;
mod cache_redis;
mod config;
mod db;
mod enrich;
mod models;
mod notify;
mod quota;
mod quota_redis;
mod retry;
mod routes;
pub mod scraper;
pub mod algo;

use std::sync::Arc;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;
use axum::http::{header, HeaderValue, Method};
use axum::http::request::Parts as RequestParts;

use crate::app_state::AppState;
use crate::auth::supabase::AuthClient;
use crate::cache::CacheProvider;
use crate::cache_redis::RedisCache;
use crate::config::Config;
use crate::db::supabase::SupabaseClient;
use crate::quota::QuotaProvider;
use crate::quota_redis::RedisQuota;
use crate::routes::{analyze, enrich as enrich_route, health, message, quota as quota_route, resume as resume_route, scrape, webhook};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config = Arc::new(Config::from_env());

    const HTTP_CLIENT_TIMEOUT_SECS: u64 = 130;
    const QUOTA_MAX_PER_WINDOW: u32 = 100;
    const QUOTA_WINDOW_MINUTES: u64 = 1440;

    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(HTTP_CLIENT_TIMEOUT_SECS))
        .build()
        .expect("Failed to build HTTP client");

    let db = Arc::new(SupabaseClient::new(
        http.clone(),
        config.supabase_url.clone(),
        config.supabase_service_key.clone(),
    ));

    let auth = AuthClient::new(
        http.clone(),
        config.supabase_url.clone(),
        config.supabase_anon_key.clone(),
    );

    // Initialize cache and quota — Redis if URL is set, otherwise in-memory
    let (cache, quota): (Arc<dyn CacheProvider>, Arc<dyn QuotaProvider>) =
        if let Some(ref redis_url) = config.redis_url {
            match redis::Client::open(redis_url.as_str()) {
                Ok(client) => match client.get_multiplexed_tokio_connection().await {
                    Ok(conn) => {
                        tracing::info!("Using Redis for cache and quota");
                        let c: Arc<dyn CacheProvider> = Arc::new(RedisCache::new(conn.clone()));
                        let q: Arc<dyn QuotaProvider> = Arc::new(RedisQuota::new(conn, QUOTA_MAX_PER_WINDOW));
                        (c, q)
                    }
                    Err(e) => {
                        tracing::warn!("Failed to connect to Redis ({}), falling back to in-memory", e);
                        fallback_cache_quota(QUOTA_MAX_PER_WINDOW, QUOTA_WINDOW_MINUTES)
                    }
                },
                Err(e) => {
                    tracing::warn!("Invalid REDIS_URL ({}), falling back to in-memory", e);
                    fallback_cache_quota(QUOTA_MAX_PER_WINDOW, QUOTA_WINDOW_MINUTES)
                }
            }
        } else {
            tracing::info!("No REDIS_URL set, using in-memory cache and quota");
            fallback_cache_quota(QUOTA_MAX_PER_WINDOW, QUOTA_WINDOW_MINUTES)
        };

    let state = Arc::new(AppState {
        http,
        config,
        db,
        cache,
        quota,
    });

    let api_strict = Router::new()
        .route("/message", post(message::handle))
        .route("/enrich", post(enrich_route::handle))
        .route("/quota", get(quota_route::handle))
        .route("/resume/process", post(resume_route::process))
        .route("/webhook/discord", post(webhook::handle))
        .route_layer(middleware::from_fn_with_state(
            auth.clone(),
            auth::supabase::auth_middleware,
        ));

    let api_optional = Router::new()
        .route("/scrape", post(scrape::handle))
        .route("/analyze", post(analyze::handle))
        .route_layer(middleware::from_fn_with_state(
            auth.clone(),
            auth::supabase::optional_auth_middleware,
        ));

    let cors_state = state.clone();
    let app = Router::new()
        .merge(api_strict)
        .merge(api_optional)
        .route("/health", get(health::handle))
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::predicate(move |origin: &HeaderValue, _parts: &RequestParts| {
                    let origin_str = origin.to_str().unwrap_or("");
                    cors_state.config.cors_origin.iter().any(|allowed| allowed == origin_str)
                }))
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT])
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let addr = format!("0.0.0.0:{}", state.config.port);
    tracing::info!("LinkScout unified backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    axum::serve(listener, app)
        .await
        .expect("Server failed");
}

fn fallback_cache_quota(
    max_per_window: u32,
    window_minutes: u64,
) -> (Arc<dyn CacheProvider>, Arc<dyn QuotaProvider>) {
    use crate::cache::Cache;
    use crate::cache::DEFAULT_CACHE_MAX_ENTRIES;
    use crate::cache::DEFAULT_CACHE_TTL_MINUTES;
    use crate::quota::QuotaTracker;
    (
        Arc::new(Cache::new(DEFAULT_CACHE_TTL_MINUTES, DEFAULT_CACHE_MAX_ENTRIES)),
        Arc::new(QuotaTracker::new(max_per_window, window_minutes)),
    )
}
