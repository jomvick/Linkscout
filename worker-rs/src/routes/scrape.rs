use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::auth::supabase::AuthenticatedUser;
use crate::enrich::logo;
use crate::app_state::AppState;
use crate::models::job::Job;
use crate::scraper::guest::GuestScraper;
use crate::scraper::JobSource;

#[derive(Deserialize)]
pub struct ScrapeRequest {
    keyword: String,
    #[serde(default = "default_limit")]
    #[allow(dead_code)]
    limit: u32,
}

fn default_limit() -> u32 {
    20
}

#[derive(Serialize)]
pub struct ScrapeResponse {
    success: bool,
    keyword: String,
    jobs: Vec<Job>,
    error: Option<String>,
}

pub async fn handle(
    State(state): State<Arc<AppState>>,
    Extension(user_opt): Extension<Option<AuthenticatedUser>>,
    Json(req): Json<ScrapeRequest>,
) -> Result<Json<ScrapeResponse>, (StatusCode, Json<serde_json::Value>)> {
    if req.keyword.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "keyword is required"})),
        ));
    }

    let actual_limit = if user_opt.is_some() {
        200 // Pas de limite (ou limite très haute) pour les connectés
    } else {
        10  // 10 max pour les non-connectés
    };

    tracing::info!("Starting scrape for keyword: {}, limit: {}", req.keyword, actual_limit);

    // 1. LinkedIn (Guest Scraper)
    let scraper = GuestScraper::new(state.http.clone(), 3);
    tracing::info!("Running GuestScraper (LinkedIn)");

    let raw_jobs = scraper.search(&req.keyword, actual_limit).await;
    tracing::info!("Scrape complete. Found {} raw jobs", raw_jobs.len());

    let mut jobs: Vec<Job> = Vec::with_capacity(raw_jobs.len());
    for raw in raw_jobs {
        // Étape A: Vérification validité & disponibilité (Rust rapide)
        if !crate::algo::filter::is_valid_and_available(&raw) {
            continue; 
        }

        // Étape B: Cohérence de l'intitulé du poste (Rust rapide)
        if !crate::algo::coherence::check_domain_coherence(&raw.title, &raw.description, &req.keyword) {
            continue;
        }

        let mut job = Job::from_raw(raw);
        job.logo_url = logo::make_logo_url(&job.company);
        
        if let Some(user) = &user_opt {
            if let Some(id) = state.db.upsert_job(&job, Some(&user.token)).await {
                job.id = id;
            }
        } else {
            // Utilisateur non connecté : on ne sauvegarde pas en base, on génère juste un ID temporaire.
            job.id = uuid::Uuid::new_v4().to_string();
        }
        
        jobs.push(job);
    }

    Ok(Json(ScrapeResponse {
        success: true,
        keyword: req.keyword,
        jobs,
        error: None,
    }))
}
