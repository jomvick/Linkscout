use chrono::Utc;
use serde::{Deserialize, Serialize};

/// Résultat brut d'un scraper (guest, apify, …).
/// Aucune logique métier — juste les champs extraits.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawJob {
    pub title: String,
    pub company: String,
    pub location: String,
    pub description: String,
    pub url: String,
    pub source: String,
    pub keyword: String,
}

/// Analyse IA d'une offre.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobAnalysis {
    pub summary: String,
    pub tech_stack: Vec<String>,
    pub match_score: Option<i32>,
    pub estimated_salary: Option<String>,
    pub contract_type: Option<String>,
    pub seniority: Option<String>,
    pub remote_policy: Option<String>,
    pub score_breakdown: Option<ScoreBreakdown>,
    pub verdict_ai: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub keyword_alignment: Option<i32>,
    pub skills_match: Option<i32>,
    pub seniority_match: Option<i32>,
}

/// Pitch / accroche générée par l'IA.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedPitch {
    pub subject: String,
    pub message: String,
}

/// Enregistrement complet tel que persisté dans Supabase.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub title: String,
    pub company: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub url: Option<String>,
    pub logo_url: Option<String>,
    pub source: String,
    pub status: String,
    pub created_at: String,
    pub match_score: Option<i32>,
    pub summary: Option<String>,
    pub tech_stack: Option<Vec<String>>,
    pub salary: Option<String>,
    pub contract_type: Option<String>,
    pub score_breakdown: Option<ScoreBreakdown>,
    pub verdict_ai: Option<String>,
    pub pitch: Option<String>,
}

impl Job {
    pub fn from_raw(raw: RawJob) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title: raw.title,
            company: raw.company,
            description: Some(raw.description),
            location: Some(raw.location),
            url: Some(raw.url),
            logo_url: None,
            source: raw.source,
            status: "new".into(),
            created_at: Utc::now().to_rfc3339(),
            match_score: None,
            summary: None,
            tech_stack: None,
            salary: None,
            contract_type: None,
            score_breakdown: None,
            verdict_ai: None,
            pitch: None,
        }
    }
}
