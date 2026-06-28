use axum::{
    body::Body,
    extract::State,
    http::{header, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticatedUser {
    pub id: String,
    pub email: Option<String>,
    #[serde(skip)]
    pub token: String,
}

#[derive(Clone)]
pub struct AuthClient {
    http: reqwest::Client,
    supabase_url: String,
    anon_key: String,
}

impl AuthClient {
    pub fn new(http: reqwest::Client, supabase_url: String, anon_key: String) -> Self {
        Self { http, supabase_url, anon_key }
    }

    pub async fn validate_token(&self, token: &str) -> Result<AuthenticatedUser, AuthError> {
        let resp = self
            .http
            .get(format!("{}/auth/v1/user", self.supabase_url))
            .header("apikey", &self.anon_key)
            .header(header::AUTHORIZATION, format!("Bearer {}", token))
            .send()
            .await
            .map_err(|_| AuthError::InvalidToken)?;

        if !resp.status().is_success() {
            return Err(AuthError::InvalidToken);
        }

        let data: serde_json::Value = resp.json().await.map_err(|_| AuthError::InvalidToken)?;

        let id = data
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or(AuthError::InvalidToken)?
            .to_string();

        let email = data.get("email").and_then(|v| v.as_str()).map(String::from);

        Ok(AuthenticatedUser { id, email, token: String::new() })
    }
}

#[derive(Debug)]
pub enum AuthError {
    MissingHeader,
    InvalidToken,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::MissingHeader => (StatusCode::UNAUTHORIZED, "Missing Authorization header"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid or expired token"),
        };
        (status, Json(json!({"error": message}))).into_response()
    }
}

/// Middleware Axum : extrait le Bearer token, le valide auprès de Supabase Auth,
/// et injecte `AuthenticatedUser` dans les extensions de la requête.
pub async fn auth_middleware(
    State(auth): State<AuthClient>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, AuthError> {
    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AuthError::MissingHeader)?;

    let mut user = auth.validate_token(token).await?;
    user.token = token.to_string();
    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}
