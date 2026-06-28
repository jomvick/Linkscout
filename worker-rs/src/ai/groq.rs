use crate::ai::prompts::{build_analysis_prompt, PITCH_PROMPT};
use crate::ai::provider::LlmProvider;
use crate::models::job::{GeneratedPitch, JobAnalysis, ScoreBreakdown};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;

const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const MODEL: &str = "llama-3.3-70b-versatile";

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

        let resp = match self
            .http
            .post(GROQ_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Groq API request failed: {}", e);
                return None;
            }
        };

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            tracing::error!("Groq API error {}: {}", status, body.chars().take(500).collect::<String>());
            return None;
        }

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
            format!("Titre: {}\nEntreprise: {}\n\nDescription:\n{}", title, company, &description[..description.len().min(4000)])
        } else {
            format!(
                "Titre: {}\nEntreprise: {}\n\nDescription:\n{}\n\nCV du candidat:\n{}",
                title,
                company,
                &description[..description.len().min(4000)],
                &resume_text[..resume_text.len().min(2000)]
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
            &description[..description.len().min(3000)]
        );

        let json = self.call(PITCH_PROMPT, &user_text, true, 0.7, 512).await?;

        Some(GeneratedPitch {
            subject: json.get("subject").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            message: json.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        })
    }
}
