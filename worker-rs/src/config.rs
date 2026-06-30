use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    #[allow(dead_code)]
    pub apify_token: String,
    #[allow(dead_code)]
    pub apify_actor_indeed: String,
    #[allow(dead_code)]
    pub apify_actor_wttj: String,
    pub groq_api_key: String,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub supabase_service_key: String,
    pub discord_webhook_url: Option<String>,
    pub cors_origin: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8001),
            apify_token: env::var("APIFY_TOKEN")
                .unwrap_or_default(),
            apify_actor_indeed: env::var("APIFY_ACTOR_INDEED")
                .unwrap_or_else(|_| "misceres/indeed-scraper".to_string()),
            apify_actor_wttj: env::var("APIFY_ACTOR_WTTJ")
                .unwrap_or_else(|_| "crawlergang/welcome-to-the-jungle-scraper".to_string()),
            groq_api_key: env::var("GROQ_API_KEY")
                .expect("GROQ_API_KEY is required"),
            supabase_url: env::var("SUPABASE_URL")
                .expect("SUPABASE_URL is required"),
            supabase_anon_key: env::var("SUPABASE_ANON_KEY")
                .expect("SUPABASE_ANON_KEY is required"),
            supabase_service_key: env::var("SUPABASE_SERVICE_KEY")
                .expect("SUPABASE_SERVICE_KEY is required"),
            discord_webhook_url: env::var("DISCORD_WEBHOOK_URL").ok(),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:3000".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
        }
    }
}
