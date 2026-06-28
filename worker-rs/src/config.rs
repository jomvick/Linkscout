use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub apify_token: String,
    pub groq_api_key: String,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub supabase_service_key: String,
    pub discord_webhook_url: Option<String>,
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
            groq_api_key: env::var("GROQ_API_KEY")
                .expect("GROQ_API_KEY is required"),
            supabase_url: env::var("SUPABASE_URL")
                .expect("SUPABASE_URL is required"),
            supabase_anon_key: env::var("SUPABASE_ANON_KEY")
                .expect("SUPABASE_ANON_KEY is required"),
            supabase_service_key: env::var("SUPABASE_SERVICE_KEY")
                .expect("SUPABASE_SERVICE_KEY is required"),
            discord_webhook_url: env::var("DISCORD_WEBHOOK_URL").ok(),
        }
    }
}
