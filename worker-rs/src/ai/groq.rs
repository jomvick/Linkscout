use crate::ai::prompts::{build_analysis_prompt, PITCH_PROMPT};
use crate::ai::provider::LlmProvider;
use crate::models::job::{GeneratedPitch, JobAnalysis, ScoreBreakdown};
use crate::retry::{with_retry, RetryOutcome};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use tokio::time::{timeout, Duration};

const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const MODEL: &str = "llama-3.3-70b-versatile";

const GROQ_TIMEOUT_SECS: u64 = 25;
const GROQ_MAX_ATTEMPTS: u32 = 3;
const GROQ_BASE_DELAY: Duration = Duration::from_millis(500);

const MAX_ANALYSIS_DESCRIPTION_CHARS: usize = 4000;
const MAX_ANALYSIS_RESUME_CHARS: usize = 2000;
const MAX_PITCH_DESCRIPTION_CHARS: usize = 3000;

pub struct GroqProvider {
    http: Client,
    api_key: String,
}

impl GroqProvider {
    pub fn new(http: Client, api_key: String) -> Self {
        Self { http, api_key }
    }

    async fn call(
        &self,
        system_prompt: &str,
        user_text: &str,
        response_format: bool,
        temperature: f64,
        max_tokens: u32,
    ) -> Option<Value> {
        let mut body = serde_json::json!({
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        });

        if response_format {
            body["response_format"] = serde_json::json!({"type": "json_object"});
        }

        let http = Arc::new(self.http.clone());
        let api_key = Arc::new(self.api_key.clone());
        let body = Arc::new(body);

        let resp = match with_retry(
            move || {
                let http = Arc::clone(&http);
                let api_key = Arc::clone(&api_key);
                let body = Arc::clone(&body);
                async move { send_groq_request(&http, &api_key, &body).await }
            },
            GROQ_MAX_ATTEMPTS,
            GROQ_BASE_DELAY,
        )
        .await
        {
            Ok(r) => r,
            Err(()) => return None,
        };

        let data: Value = match resp.json().await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("Groq API JSON parse failed: {}", e);
                return None;
            }
        };

        let content = data
            .pointer("/choices/0/message/content")
            .and_then(|c| c.as_str());

        let content = match content {
            Some(c) => c,
            None => {
                tracing::error!("Groq API response missing content field: {:?}", data);
                return None;
            }
        };

        let cleaned = content
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        match serde_json::from_str(cleaned) {
            Ok(v) => Some(v),
            Err(e) => {
                tracing::error!("Groq API JSON parse of content failed: {}. Content: {}", e, cleaned.chars().take(300).collect::<String>());
                None
            }
        }
    }
}

#[async_trait]
impl LlmProvider for GroqProvider {
    fn name(&self) -> &'static str {
        "groq"
    }

    async fn analyze(
        &self,
        title: &str,
        company: &str,
        description: &str,
        keyword: &str,
        resume_text: &str,
    ) -> Option<JobAnalysis> {
        let prompt = build_analysis_prompt(keyword, resume_text);
        let user_text = if resume_text.trim().is_empty() {
            format!("Titre: {}\nEntreprise: {}\n\nDescription:\n{}", title, company, &description[..description.len().min(MAX_ANALYSIS_DESCRIPTION_CHARS)])
        } else {
            format!(
                "Titre: {}\nEntreprise: {}\n\nDescription:\n{}\n\nCV du candidat:\n{}",
                title,
                company,
                &description[..description.len().min(MAX_ANALYSIS_DESCRIPTION_CHARS)],
                &resume_text[..resume_text.len().min(MAX_ANALYSIS_RESUME_CHARS)]
            )
        };

        let json = self.call(&prompt, &user_text, true, 0.1, 1024).await?;

        let summary = json.get("summary").map(|v| {
            if let Some(s) = v.as_str() {
                s.to_string()
            } else if let Some(arr) = v.as_array() {
                arr.iter()
                    .filter_map(|i| i.as_str().map(String::from))
                    .collect::<Vec<_>>()
                    .join("\n")
            } else {
                String::new()
            }
        }).unwrap_or_default();

        Some(JobAnalysis {
            summary,
            tech_stack: json
                .get("tech_stack")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default(),
            match_score: json.get("match_score").and_then(|v| v.as_i64()).map(|v| v as i32),
            estimated_salary: json
                .get("estimated_salary")
                .and_then(|v| v.as_str().map(String::from)),
            contract_type: json
                .get("contract_type")
                .and_then(|v| v.as_str().map(String::from)),
            seniority: json
                .get("seniority")
                .and_then(|v| v.as_str().map(String::from)),
            remote_policy: json
                .get("remote_policy")
                .and_then(|v| v.as_str().map(String::from)),
            score_breakdown: json.get("score_breakdown").and_then(|sb| {
                Some(ScoreBreakdown {
                    keyword_alignment: sb
                        .get("keyword_alignment")
                        .and_then(|v| v.as_i64())
                        .map(|v| v as i32),
                    skills_match: sb
                        .get("skills_match")
                        .and_then(|v| v.as_i64())
                        .map(|v| v as i32),
                    seniority_match: sb
                        .get("seniority_match")
                        .and_then(|v| v.as_i64())
                        .map(|v| v as i32),
                })
            }),
            verdict_ai: json
                .get("verdict_ai")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        })
    }

    async fn generate_pitch(
        &self,
        title: &str,
        company: &str,
        description: &str,
    ) -> Option<GeneratedPitch> {
        let user_text = format!(
            "Titre: {}\nEntreprise: {}\n\nDescription:\n{}",
            title,
            company,
            &description[..description.len().min(MAX_PITCH_DESCRIPTION_CHARS)]
        );

        let json = self.call(PITCH_PROMPT, &user_text, true, 0.7, 512).await?;

        Some(GeneratedPitch {
            subject: json.get("subject").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            message: json.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }
}

async fn send_groq_request(
    http: &Client,
    api_key: &str,
    body: &Value,
) -> RetryOutcome<reqwest::Response, ()> {
    match timeout(
        Duration::from_secs(GROQ_TIMEOUT_SECS),
        http.post(GROQ_URL)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(body)
            .send(),
    )
    .await
    {
        Ok(Ok(resp)) => classify_groq_response(resp).await,
        Ok(Err(e)) => {
            tracing::warn!("Groq API request failed (retryable): {}", e);
            RetryOutcome::Retry(())
        }
        Err(_) => {
            tracing::warn!(
                "Groq API request timed out after {}s (retryable)",
                GROQ_TIMEOUT_SECS
            );
            RetryOutcome::Retry(())
        }
    }
}

async fn classify_groq_response(resp: reqwest::Response) -> RetryOutcome<reqwest::Response, ()> {
    let status = resp.status();
    if status.is_success() {
        RetryOutcome::Ok(resp)
    } else if status.is_server_error() || status == 429 {
        let body = resp.text().await.unwrap_or_default();
        tracing::warn!(
            "Groq API retryable error {}: {}",
            status,
            body.chars().take(500).collect::<String>()
        );
        RetryOutcome::Retry(())
    } else {
        let body = resp.text().await.unwrap_or_default();
        tracing::error!(
            "Groq API error {}: {}",
            status,
            body.chars().take(500).collect::<String>()
        );
        RetryOutcome::Fail(())
    }
}
