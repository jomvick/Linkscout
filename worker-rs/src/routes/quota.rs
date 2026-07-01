use std::sync::Arc;

use axum::{extract::State, Extension, Json};
use serde::Serialize;

use crate::app_state::AppState;
use crate::auth::supabase::AuthenticatedUser;
use crate::quota::QuotaInfo;

#[derive(Serialize)]
pub struct QuotaResponse {
    success: bool,
    quota: QuotaInfo,
}

pub async fn handle(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<AuthenticatedUser>,
) -> Json<QuotaResponse> {
    Json(QuotaResponse {
        success: true,
        quota: state.quota.peek(&user.id).await,
    })
}
