use crate::models::job::Job;
use reqwest::Client;
use serde_json::json;

pub struct DiscordNotifier {
    http: Client,
    webhook_url: String,
}

impl DiscordNotifier {
    pub fn new(http: Client, webhook_url: String) -> Self {
        Self { http, webhook_url }
    }

    fn embed_color(score: i32) -> u32 {
        if score >= 90 {
            0x10B981
        } else if score >= 70 {
            0xF59E0B
        } else {
            0x0A66C2
        }
    }

    pub async fn notify(&self, job: &Job) -> bool {
        let score = match job.match_score {
            Some(s) => s,
            None => return false,
        };

        let salary = job.salary.as_deref().unwrap_or("Non spécifié");
        let location = job.location.as_deref().unwrap_or("Non spécifié");
        let empty = vec![];
        let tech_stack = job.tech_stack.as_deref().unwrap_or(&empty);

        let mut fields = vec![
            json!({"name": "🏢 Entreprise", "value": &job.company, "inline": true}),
            json!({"name": "📍 Lieu", "value": location, "inline": true}),
            json!({"name": "🎯 Match Score", "value": format!("**{}%**", score), "inline": true}),
            json!({"name": "💰 Salaire / TJM", "value": salary, "inline": true}),
        ];

        if !tech_stack.is_empty() {
            let stack = tech_stack.iter().map(|s| s.as_str()).collect::<Vec<_>>().join(", ");
            fields.push(json!({"name": "🛠 Stack", "value": stack, "inline": false}));
        }

        let mut embed = json!({
            "title": format!("🔥 {}", job.title),
            "url": job.url,
            "color": Self::embed_color(score),
            "fields": fields,
            "footer": {"text": "LinkScout • Alerte opportunité"},
        });

        if let Some(ref logo) = job.logo_url {
            embed["thumbnail"] = json!({"url": logo});
        }

        let payload = json!({
            "username": "LinkScout",
            "embeds": [embed],
        });

        match self
            .http
            .post(&self.webhook_url)
            .json(&payload)
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => {
                tracing::info!(
                    "Discord notification sent for: {} @ {} (score={})",
                    job.title,
                    job.company,
                    score
                );
                true
            }
            _ => false,
        }
    }
}
