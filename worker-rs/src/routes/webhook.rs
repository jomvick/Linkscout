use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::auth::supabase::AuthenticatedUser;
use crate::app_state::AppState;
use crate::notify::discord::DiscordNotifier;

#[derive(Deserialize)]
pub struct WebhookRequest {
    job_id: String,
}

#[derive(Serialize)]
pub struct WebhookResponse {
    success: bool,
    error: Option<String>,
}

pub async fn handle(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<AuthenticatedUser>,
    Json(req): Json<WebhookRequest>,
) -> Result<Json<WebhookResponse>, (StatusCode, Json<serde_json::Value>)> {
    let job = state.db.get_job(&req.job_id).await;

    let job = match job {
        Some(j) => j,
        None => {
            return Ok(Json(WebhookResponse {
                success: false,
                error: Some("job not found".into()),
            }))
        }
    };

    let webhook_url = match state.config.discord_webhook_url {
        Some(ref url) => url.clone() as String,
        None => {
            return Ok(Json(WebhookResponse {
                success: false,
                error: Some("discord webhook not configured".into()),
            }))
        }
    };

    let notifier = DiscordNotifier::new(state.http.clone(), webhook_url);
    let sent = notifier.notify(&job).await;

    Ok(Json(WebhookResponse {
        success: sent,
        error: if sent { None } else { Some("discord notification failed".into()) },
    }))
}
