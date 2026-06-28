mod ai;
mod app_state;
mod auth;
mod cache;
mod config;
mod db;
mod enrich;
mod models;
mod notify;
mod quota;
mod routes;
mod scraper;

use std::sync::Arc;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::app_state::AppState;
use crate::auth::supabase::AuthClient;
use crate::cache::Cache;
use crate::config::Config;
use crate::db::supabase::SupabaseClient;
use crate::quota::QuotaTracker;
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

    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(130))
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

    let cache = Arc::new(Cache::new(60, 500));
    let quota = Arc::new(QuotaTracker::new(100, 1440));

    let state = Arc::new(AppState {
        http,
        config,
        db,
        cache,
        quota,
    });

    let app = Router::new()
        .route("/scrape", post(scrape::handle))
        .route("/analyze", post(analyze::handle))
        .route("/message", post(message::handle))
        .route("/enrich", post(enrich_route::handle))
        .route("/quota", get(quota_route::handle))
        .route("/resume/process", post(resume_route::process))
        .route("/webhook/discord", post(webhook::handle))
        .route_layer(middleware::from_fn_with_state(
            auth.clone(),
            auth::supabase::auth_middleware,
        ))
        .route("/health", get(health::handle))
        .layer(CorsLayer::permissive())
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
