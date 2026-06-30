use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Extension, Json};
use lopdf::Document;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::auth::supabase::AuthenticatedUser;
use crate::app_state::AppState;

const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const MODEL: &str = "llama-3.3-70b-versatile";

#[derive(Deserialize)]
pub struct ProcessRequest {
    resume_id: String,
    storage_path: String,
    #[allow(dead_code)]
    file_name: String,
}

#[derive(Serialize)]
pub struct ProcessResponse {
    success: bool,
    status: String,
    error: Option<String>,
    skills: Vec<String>,
    search_keywords: Vec<String>,
    summary: Option<String>,
    chars: usize,
}

#[derive(Serialize)]
pub struct SkillExtraction {
    pub skills: Vec<String>,
    pub search_keywords: Vec<String>,   // LinkedIn-ready job title keywords (max 3)
    pub summary: String,
}

async fn call_groq(http: &reqwest::Client, api_key: &str, system: &str, user: &str) -> Option<Value> {
    let resp = http
        .post(GROQ_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 1024,
        }))
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        tracing::error!("Groq API error {}: {}", status, body.chars().take(300).collect::<String>());
        return None;
    }

    let data: Value = resp.json().await.ok()?;
    let content = data
        .pointer("/choices/0/message/content")
        .and_then(|c| c.as_str())?;

    let cleaned = content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    serde_json::from_str(cleaned).ok()
}

async fn extract_skills(http: &reqwest::Client, api_key: &str, raw_text: &str) -> Option<SkillExtraction> {
    let system = r#"Tu es un expert en analyse de CV techniques.
Retourne UNIQUEMENT un JSON valide avec ces 3 champs:
{
  "extracted_skills": ["React", "TypeScript", "Node.js"],
  "search_keywords": ["React Developer", "TypeScript Engineer", "Full Stack Node.js"],
  "summary": "micro-r\u00e9sum\u00e9 du profil en 2 phrases max (fran\u00e7ais)"
}

R\u00e8gles pour search_keywords:
- Maximum 3 mots-cl\u00e9s
- Chaque mot-cl\u00e9 doit \u00eatre un intitul\u00e9 de poste LinkedIn r\u00e9el et searchable (ex: \"Senior React Developer\", \"DevOps Engineer\", \"Product Manager Tech\")
- Base-toi sur le niveau d'exp\u00e9rience du candidat (junior/senior/lead) d\u00e9duit du CV
- Priorise les termes en anglais car c'est le standard sur LinkedIn international"#;

    let user_text = &raw_text[..raw_text.len().min(6000)];

    let json = call_groq(http, api_key, system, user_text).await?;

    let skills: Vec<String> = json
        .get("extracted_skills")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let search_keywords: Vec<String> = json
        .get("search_keywords")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .take(3)
                .collect()
        })
        .unwrap_or_else(|| {
            // Fallback: derive simple keywords from top skills
            skills.iter().take(3).map(|s| format!("{} Developer", s)).collect()
        });

    let summary = json
        .get("summary")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Some(SkillExtraction { skills, search_keywords, summary })
}

fn extract_text_from_pdf(bytes: &[u8]) -> Result<String, String> {
    let doc = Document::load_mem(bytes).map_err(|e| format!("lopdf load: {}", e))?;
    let mut text = String::new();
    let pages = doc.get_pages();
    let page_numbers: Vec<u32> = pages.keys().copied().collect();
    for page_num in &page_numbers {
        match doc.extract_text(&[*page_num]) {
            Ok(page_text) => {
                text.push_str(&page_text);
                text.push('\n');
            }
            Err(e) => {
                tracing::warn!("lopdf extract page {}: {}", page_num, e);
            }
        }
    }
    Ok(text.trim().to_string())
}

pub async fn process(
    State(state): State<Arc<AppState>>,
    Extension(_user): Extension<AuthenticatedUser>,
    Json(req): Json<ProcessRequest>,
) -> Result<Json<ProcessResponse>, (StatusCode, Json<serde_json::Value>)> {
    let config = &state.config;

    state.db.update_resume_status(&req.resume_id, "processing", None).await;

    // 1. Download PDF from Supabase Storage
    let download_url = format!(
        "{}/storage/v1/object/resumes/{}",
        config.supabase_url, req.storage_path
    );

    let pdf_bytes = match state
        .http
        .get(&download_url)
        .header("Authorization", format!("Bearer {}", config.supabase_service_key))
        .send()
        .await
    {
        Ok(r) if r.status().is_success() => r.bytes().await.unwrap_or_default(),
        Ok(r) => {
            let status = r.status();
            let body = r.text().await.unwrap_or_default();
            tracing::error!("Storage download failed: status={}, body={}", status, body.chars().take(200).collect::<String>());
            state.db.update_resume_status(&req.resume_id, "failed", Some("Storage download failed")).await;
            return Err((StatusCode::BAD_GATEWAY, Json(json!({"error": "Failed to download file from storage"}))));
        }
        Err(e) => {
            tracing::error!("Storage download error: {}", e);
            state.db.update_resume_status(&req.resume_id, "failed", Some(&format!("Storage error: {}", e))).await;
            return Err((StatusCode::BAD_GATEWAY, Json(json!({"error": "Storage connection failed"}))));
        }
    };

    // 2. Parse PDF with lopdf
    let raw_text = match extract_text_from_pdf(&pdf_bytes) {
        Ok(text) => text,
        Err(e) => {
            tracing::error!("PDF parsing failed: {}", e);
            state.db.update_resume_status(&req.resume_id, "failed", Some(&format!("PDF parse error: {}", e))).await;
            return Err((StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": format!("PDF parse error: {}", e)}))));
        }
    };

    if raw_text.trim().len() < 20 {
        state.db.update_resume_status(&req.resume_id, "failed", Some("Extracted text too short")).await;
        return Err((StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": "Extracted text too short or empty"}))));
    }

    let chars = raw_text.len();

    // 3. Call Groq to extract skills + summary
    let extracted = match extract_skills(&state.http, &config.groq_api_key, &raw_text).await {
        Some(r) => r,
        None => {
            state.db.update_resume_status(&req.resume_id, "failed", Some("AI extraction failed")).await;
            return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "AI extraction failed"}))));
        }
    };

    // 4. Update resume in Supabase
    state.db
        .update_resume_with_analysis(
            &req.resume_id,
            &raw_text,
            &extracted.skills,
            &extracted.search_keywords,
            &extracted.summary,
        )
        .await;

    Ok(Json(ProcessResponse {
        success: true,
        status: "done".into(),
        error: None,
        skills: extracted.skills,
        search_keywords: extracted.search_keywords,
        summary: Some(extracted.summary),
        chars,
    }))
}
