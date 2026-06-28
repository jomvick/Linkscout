use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::auth::supabase::AuthenticatedUser;
use crate::enrich::logo;
use crate::app_state::AppState;

#[derive(Deserialize)]
pub struct EnrichRequest {
    company: String,
    job_id: Option<String>,
}

#[derive(Serialize)]
pub struct EnrichResponse {
    success: bool,
    logo_url: Option<String>,
    error: Option<String>,
}

pub async fn handle(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<AuthenticatedUser>,
    Json(req): Json<EnrichRequest>,
) -> Result<Json<EnrichResponse>, (StatusCode, Json<serde_json::Value>)> {
    let logo_url = logo::make_logo_url(&req.company);

    if let (Some(url), Some(job_id)) = (&logo_url, &req.job_id) {
        state.db.update_logo(job_id, url).await;
    }

    Ok(Json(EnrichResponse {
        success: logo_url.is_some(),
        logo_url,
        error: None,
    }))
}
