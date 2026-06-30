use crate::models::job::RawJob;
use crate::retry::{with_retry, RetryOutcome};
use crate::scraper::JobSource;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use tokio::time::Duration;

const APIFY_API: &str = "https://api.apify.com/v2";
const APIFY_MAX_ATTEMPTS: u32 = 3;
const APIFY_BASE_DELAY: Duration = Duration::from_millis(500);

#[derive(Clone)]
pub struct ApifyScraper {
    http: Client,
    token: String,
    actor_id: String,
    source_name: String,
}

impl ApifyScraper {
    pub fn new(http: Client, token: String, actor_id: String, source_name: String) -> Self {
        Self { http, token, actor_id, source_name }
    }

    async fn run_actor(&self, keyword: &str, limit: u32) -> Result<Vec<Value>, String> {
        // WTTJ scraper uses searchQuery, Indeed uses position, LinkedIn uses keywords
        // Let's pass all possible keys, actors usually ignore unknown keys.
        let input = serde_json::json!({
            "keywords": keyword,
            "searchQuery": keyword,
            "position": keyword,
            "country": "FR",
            "location": "",
            "maxItems": limit,
            "proxyConfiguration": {
                "useApifyProxy": true
            }
        });

        let safe_actor_id = self.actor_id.replace("/", "~");
        let url = format!(
            "{}/acts/{}/run-sync-get-dataset-items?timeout=120",
            APIFY_API, safe_actor_id
        );

        let http = Arc::new(self.http.clone());
        let token = Arc::new(self.token.clone());
        let url = Arc::new(url);
        let input = Arc::new(input);

        let resp = with_retry(
            move || {
                let http = Arc::clone(&http);
                let token = Arc::clone(&token);
                let url = Arc::clone(&url);
                let input = Arc::clone(&input);
                async move { send_apify_request(&http, &token, &url, &input).await }
            },
            APIFY_MAX_ATTEMPTS,
            APIFY_BASE_DELAY,
        )
        .await?;

        resp.json::<Vec<Value>>()
            .await
            .map_err(|e| format!("Failed to parse Apify response: {}", e))
    }

    fn map_item(&self, item: &Value, keyword: &str) -> RawJob {
        let obj = item.as_object().cloned().unwrap_or_default();

        let title = obj
            .get("title")
            .or_else(|| obj.get("positionName"))
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
            source: self.source_name.clone(),
            keyword: keyword.to_string(),
            posted_at: None,
        }
    }
}

#[async_trait]
impl JobSource for ApifyScraper {
    fn name(&self) -> &'static str {
        // Since we need to return &'static str but we have a String, we leak it or just return a generic name.
        // Actually, name() isn't heavily used right now. Let's just return "apify".
        "apify"
    }

    async fn search(&self, keyword: &str, limit: u32) -> Vec<RawJob> {
        match self.run_actor(keyword, limit).await {
            Ok(items) => items.iter().map(|v| self.map_item(v, keyword)).collect(),
            Err(e) => {
                tracing::warn!("Apify scrape failed for {}: {}", self.source_name, e);
                vec![]
            }
        }
    }
}

async fn send_apify_request(
    http: &Client,
    token: &str,
    url: &str,
    input: &Value,
) -> RetryOutcome<reqwest::Response, String> {
    match http
        .post(url)
        .bearer_auth(token)
        .json(input)
        .send()
        .await
    {
        Ok(resp) => classify_apify_response(resp).await,
        Err(e) => {
            let msg = format!("Apify request failed: {}", e);
            tracing::warn!("{} (retryable)", msg);
            RetryOutcome::Retry(msg)
        }
    }
}

async fn classify_apify_response(
    resp: reqwest::Response,
) -> RetryOutcome<reqwest::Response, String> {
    let status = resp.status();
    if status.is_success() {
        RetryOutcome::Ok(resp)
    } else if status.is_server_error() || status == 429 {
        let body = resp.text().await.unwrap_or_default();
        let msg = format!("Apify returned {}: {}", status, body);
        tracing::warn!("{} (retryable)", msg);
        RetryOutcome::Retry(msg)
    } else {
        let body = resp.text().await.unwrap_or_default();
        let msg = format!("Apify returned {}: {}", status, body);
        tracing::error!("{}", msg);
        RetryOutcome::Fail(msg)
    }
}
