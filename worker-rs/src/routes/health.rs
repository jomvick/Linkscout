use axum::Json;
use serde_json::json;

pub async fn handle() -> Json<serde_json::Value> {
    Json(json!({"status": "ok", "mode": "linkscout-unified"}))
}
