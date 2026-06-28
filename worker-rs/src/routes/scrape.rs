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
    Extension(user): Extension<AuthenticatedUser>,
    Json(req): Json<ScrapeRequest>,
) -> Result<Json<ScrapeResponse>, (StatusCode, Json<serde_json::Value>)> {
    if req.keyword.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "keyword is required"})),
        ));
    }

    let scraper = GuestScraper::new(state.http.clone(), 3);
    let raw_jobs = scraper.search(&req.keyword, req.limit).await;

    let mut jobs: Vec<Job> = Vec::with_capacity(raw_jobs.len());
    for raw in raw_jobs {
        let mut job = Job::from_raw(raw);
        job.logo_url = logo::make_logo_url(&job.company);
        if let Some(id) = state.db.upsert_job(&job, Some(&user.token)).await {
            job.id = id;
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
