use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::ai::groq::GroqProvider;
use crate::ai::provider::LlmProvider;
use crate::auth::supabase::AuthenticatedUser;
use crate::app_state::AppState;
use crate::models::job::GeneratedPitch;
use crate::quota::QuotaInfo;

#[derive(Deserialize)]
pub struct PitchRequest {
    title: Option<String>,
    company: Option<String>,
    description: String,
    job_id: Option<String>,
}

#[derive(Serialize)]
pub struct PitchResponse {
    success: bool,
    pitch: Option<GeneratedPitch>,
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quota: Option<QuotaInfo>,
}

pub async fn handle(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthenticatedUser>,
    Json(req): Json<PitchRequest>,
) -> Result<Json<PitchResponse>, (StatusCode, Json<serde_json::Value>)> {
    if let Err(q) = state.quota.check_and_increment(&user.id).await {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": "Quota API dépassé.",
                "quota": q
            })),
        ));
    }

    let provider = GroqProvider::new(
        state.http.clone(),
        state.config.groq_api_key.clone(),
    );

    let pitch = provider
        .generate_pitch(
            req.title.as_deref().unwrap_or(""),
            req.company.as_deref().unwrap_or(""),
            &req.description,
        )
        .await;

    let quota_info = state.quota.peek(&user.id).await;

    match pitch {
        Some(p) => {
            if let Some(ref job_id) = req.job_id {
                let full = format!("{}\n\n{}", p.subject, p.message);
                state.db.update_pitch(job_id, &full).await;
            }
            Ok(Json(PitchResponse {
                success: true,
                pitch: Some(p),
                error: None,
                quota: Some(quota_info),
            }))
        }
        None => Ok(Json(PitchResponse {
            success: false,
            pitch: None,
            error: Some("AI pitch generation failed".into()),
            quota: Some(quota_info),
        })),
    }
}
