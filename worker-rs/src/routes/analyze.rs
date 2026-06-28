use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::ai::groq::GroqProvider;
use crate::ai::provider::LlmProvider;
use crate::auth::supabase::AuthenticatedUser;
use crate::app_state::AppState;
use crate::cache::Cache;
use crate::models::job::JobAnalysis;
use crate::quota::QuotaInfo;

#[derive(Deserialize)]
pub struct AnalyzeRequest {
    title: Option<String>,
    company: Option<String>,
    description: String,
    keyword: Option<String>,
    resume_text: Option<String>,
    job_id: Option<String>,
}

#[derive(Serialize)]
pub struct AnalyzeResponse {
    success: bool,
    analysis: Option<JobAnalysis>,
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quota: Option<QuotaInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cached: Option<bool>,
}

pub async fn handle(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthenticatedUser>,
    Json(req): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, (StatusCode, Json<serde_json::Value>)> {
    let description = &req.description;
    let keyword = req.keyword.as_deref().unwrap_or("");
    let resume_text = req.resume_text.as_deref().unwrap_or("");

    // Vérification cache (ne consomme pas de quota)
    let cache_key = Cache::make_key(&user.id, "analyze", description, keyword);
    if let Some(cached) = state.cache.get(&cache_key) {
        if let Ok(analysis) = serde_json::from_str::<JobAnalysis>(&cached) {
            return Ok(Json(AnalyzeResponse {
                success: true,
                analysis: Some(analysis),
                error: None,
                quota: Some(state.quota.peek(&user.id)),
                cached: Some(true),
            }));
        }
    }

    // Vérification quota (uniquement pour les appels API réels)
    if let Err(q) = state.quota.check_and_increment(&user.id) {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": "Quota API dépassé. Réessaie dans quelques heures.",
                "quota": q
            })),
        ));
    }

    let provider = GroqProvider::new(
        state.http.clone(),
        state.config.groq_api_key.clone(),
    );

    let analysis = provider
        .analyze(
            req.title.as_deref().unwrap_or(""),
            req.company.as_deref().unwrap_or(""),
            description,
            keyword,
            resume_text,
        )
        .await;

    let quota_info = state.quota.peek(&user.id);

    match analysis {
        Some(a) => {
            if let Ok(serialized) = serde_json::to_string(&a) {
                state.cache.set(cache_key, serialized);
            }
            if let Some(ref job_id) = req.job_id {
                state.db.update_analysis(job_id, &a).await;
            }
            Ok(Json(AnalyzeResponse {
                success: true,
                analysis: Some(a),
                error: None,
                quota: Some(quota_info),
                cached: Some(false),
            }))
        }
        None => Ok(Json(AnalyzeResponse {
            success: false,
            analysis: None,
            error: Some("AI analysis failed".into()),
            quota: Some(quota_info),
            cached: None,
        })),
    }
}
