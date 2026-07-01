/// Client Supabase REST — écriture seule via la clé service_role.
/// La lecture se fait côté Next.js (Realtime + GET /api/jobs).
use crate::models::job::{Job, JobAnalysis};
use reqwest::Client;
use serde_json::json;

pub struct SupabaseClient {
    http: Client,
    url: String,
    service_key: String,
}

impl SupabaseClient {
    pub fn new(http: Client, url: String, service_key: String) -> Self {
        Self { http, url, service_key }
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        self.headers_with_token(&self.service_key)
    }

    fn headers_with_token(&self, bearer_token: &str) -> reqwest::header::HeaderMap {
        let mut h = reqwest::header::HeaderMap::new();
        h.insert(
            "apikey",
            reqwest::header::HeaderValue::from_str(&self.service_key)
                .expect("invalid service key header"),
        );
        h.insert(
            "Authorization",
            reqwest::header::HeaderValue::from_str(&format!("Bearer {}", bearer_token))
                .expect("invalid bearer token header"),
        );
        h.insert(
            "Content-Type",
            reqwest::header::HeaderValue::from_static("application/json"),
        );
        h.insert(
            "Prefer",
            reqwest::header::HeaderValue::from_static("return=representation"),
        );
        h
    }

    /// Insère ou met à jour un job (upsert sur url).
    /// Retourne l'ID du job dans Supabase.
    /// Si `user_token` est fourni, il est utilisé comme Bearer
    /// (permet au user JWT de passer la RLS).
    pub async fn upsert_job(&self, job: &Job, user_token: Option<&str>) -> Option<String> {
        let headers = match user_token {
            Some(t) => self.headers_with_token(t),
            None => self.headers(),
        };

        let row = json!({
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "location": job.location,
            "url": job.url,
            "logo_url": job.logo_url,
            "source": job.source,
            "status": job.status,
        });

        // Tentative d'update d'abord
        if let Some(ref url) = job.url {
            let update_resp = self
                .http
                .patch(format!("{}/rest/v1/jobs?url=eq.{}", self.url, urlencoding::encode(url)))
                .headers(headers.clone())
                .json(&row)
                .send()
                .await;

            match update_resp {
                Ok(r) if r.status().is_success() => {
                    let body: Vec<serde_json::Value> = r.json().await.unwrap_or_default();
                    if let Some(record) = body.first() {
                        return record.get("id").and_then(|v| v.as_str().map(String::from));
                    }
                }
                Ok(r) => {
                    let status = r.status();
                    let body_limit = r.text().await.unwrap_or_default().chars().take(200).collect::<String>();
                    tracing::debug!("Supabase PATCH (upsert) not success: status={}, body={}", status, body_limit);
                }
                Err(e) => {
                    tracing::debug!("Supabase PATCH (upsert) error: {}", e);
                }
            }
        }

        // Insert si pas trouvé
        let insert_resp = self
            .http
            .post(format!("{}/rest/v1/jobs", self.url))
            .headers(headers)
            .json(&row)
            .send()
            .await;

        match insert_resp {
            Ok(r) if r.status().is_success() => {
                let body: Vec<serde_json::Value> = r.json().await.unwrap_or_default();
                let id = body.first()
                    .and_then(|v| v.get("id"))
                    .and_then(|v| v.as_str().map(String::from));
                if id.is_none() {
                    tracing::warn!("Supabase insert returned empty body");
                }
                id
            }
            Ok(r) => {
                let status = r.status();
                let body = r.text().await.unwrap_or_default();
                tracing::warn!("Supabase insert failed: status={}, body={}", status, body);
                None
            }
            Err(e) => {
                tracing::warn!("Supabase insert error: {}", e);
                None
            }
        }
    }

    /// Met à jour les champs d'analyse IA d'un job.
    pub async fn update_analysis(&self, job_id: &str, analysis: &JobAnalysis) -> bool {
        let patch = json!({
            "summary": analysis.summary,
            "tech_stack": analysis.tech_stack,
            "salary": analysis.estimated_salary,
            "contract_type": analysis.contract_type,
            "seniority": analysis.seniority,
            "remote_policy": analysis.remote_policy,
            "match_score": analysis.match_score,
            "score_breakdown": analysis.score_breakdown,
            "verdict_ai": analysis.verdict_ai,
            "score_coherence_generale": analysis.score_coherence_generale,
            "score_coherence_cv": analysis.score_coherence_cv,
            "status": "enriched",
        });

        let resp = self
            .http
            .patch(format!("{}/rest/v1/jobs?id=eq.{}", self.url, job_id))
            .headers(self.headers())
            .json(&patch)
            .send()
            .await;

        resp.is_ok_and(|r| r.status().is_success())
    }

    /// Met à jour le pitch d'un job.
    pub async fn update_pitch(&self, job_id: &str, pitch: &str) -> bool {
        let patch = json!({"pitch": pitch});

        let resp = self
            .http
            .patch(format!("{}/rest/v1/jobs?id=eq.{}", self.url, job_id))
            .headers(self.headers())
            .json(&patch)
            .send()
            .await;

        resp.is_ok_and(|r| r.status().is_success())
    }

    /// Met à jour le logo_url d'un job.
    pub async fn update_logo(&self, job_id: &str, logo_url: &str) -> bool {
        let patch = json!({"logo_url": logo_url});

        let resp = self
            .http
            .patch(format!("{}/rest/v1/jobs?id=eq.{}", self.url, job_id))
            .headers(self.headers())
            .json(&patch)
            .send()
            .await;

        resp.is_ok_and(|r| r.status().is_success())
    }

    /// Récupère un job par son ID.
    pub async fn get_job(&self, job_id: &str) -> Option<Job> {
        let resp = self
            .http
            .get(format!("{}/rest/v1/jobs?id=eq.{}&select=*", self.url, job_id))
            .headers(self.headers())
            .send()
            .await
            .ok()?;

        let mut records: Vec<Job> = resp.json().await.ok()?;
        records.pop()
    }

    // ── Resume / CV ─────────────────────────────────────────

    pub async fn update_resume_status(&self, resume_id: &str, status: &str, error_msg: Option<&str>) -> bool {
        let mut patch = json!({"status": status});
        if let Some(msg) = error_msg {
            patch["error_message"] = json!(msg);
        }

        let resp = self
            .http
            .patch(format!("{}/rest/v1/resumes?id=eq.{}", self.url, resume_id))
            .headers(self.headers())
            .json(&patch)
            .send()
            .await;

        resp.is_ok_and(|r| r.status().is_success())
    }

    pub async fn update_resume_with_analysis(
        &self,
        resume_id: &str,
        raw_text: &str,
        skills: &[String],
        search_keywords: &[String],
        summary: &str,
    ) -> bool {
        let patch = json!({
            "status": "done",
            "raw_text": raw_text,
            "extracted_skills": skills,
            "search_keywords": search_keywords,
            "summary": summary,
            "updated_at": "now()",
        });

        let resp = self
            .http
            .patch(format!("{}/rest/v1/resumes?id=eq.{}", self.url, resume_id))
            .headers(self.headers())
            .json(&patch)
            .send()
            .await;

        resp.is_ok_and(|r| r.status().is_success())
    }
}

