use crate::models::job::RawJob;
use crate::scraper::JobSource;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;

const APIFY_ACTOR_ID: &str = "logical_scrapers/linkedin-jobs-scraper";
const APIFY_API: &str = "https://api.apify.com/v2";

pub struct ApifyScraper {
    http: Client,
    token: String,
}

impl ApifyScraper {
    pub fn new(http: Client, token: String) -> Self {
        Self { http, token }
    }

    async fn run_actor(&self, keyword: &str, limit: u32) -> Result<Vec<Value>, String> {
        let input = serde_json::json!({
            "keywords": keyword,
            "location": "",
            "maxItems": limit,
            "proxyConfiguration": {
                "useApifyProxy": true
            }
        });

        let url = format!(
            "{}/acts/{}/run-sync-get-dataset-items?token={}&timeout=120",
            APIFY_API, APIFY_ACTOR_ID, self.token
        );

        let resp = self
            .http
            .post(&url)
            .json(&input)
            .send()
            .await
            .map_err(|e| format!("Apify request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Apify returned {}: {}", status, body));
        }

        resp.json::<Vec<Value>>()
            .await
            .map_err(|e| format!("Failed to parse Apify response: {}", e))
    }

    fn map_item(item: &Value, keyword: &str) -> RawJob {
        let obj = item.as_object().cloned().unwrap_or_default();

        let title = obj
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let company = obj
            .get("companyName")
            .or_else(|| obj.get("company"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let location = obj
            .get("location")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let description = obj
            .get("descriptionHtml")
            .or_else(|| obj.get("description"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let url = obj
            .get("url")
            .or_else(|| obj.get("jobUrl"))
            .or_else(|| obj.get("externalUrl"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        RawJob {
            title,
            company,
            location,
            description,
            url,
            source: "apify".into(),
            keyword: keyword.to_string(),
        }
    }
}

#[async_trait]
impl JobSource for ApifyScraper {
    fn name(&self) -> &'static str {
        "apify"
    }

    async fn search(&self, keyword: &str, limit: u32) -> Vec<RawJob> {
        match self.run_actor(keyword, limit).await {
            Ok(items) => items.iter().map(|v| Self::map_item(v, keyword)).collect(),
            Err(e) => {
                tracing::warn!("Apify scrape failed: {}", e);
                vec![]
            }
        }
    }
}
