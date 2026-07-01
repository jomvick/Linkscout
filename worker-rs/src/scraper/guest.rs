use crate::models::job::RawJob;
use crate::scraper::JobSource;
use async_trait::async_trait;
use chrono::{DateTime, TimeDelta, Utc};
use rand::seq::SliceRandom;
use regex::Regex;
use scraper::{Html, Selector};
use std::sync::LazyLock;
use tokio::sync::Semaphore;

const GUEST_API: &str =
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const GUEST_BATCH_LIMIT: u32 = 25;

static USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

static JOB_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"/jobs/view/.+-(\d+)").unwrap());

static BOILERPLATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)(about the company|a propos de l'entreprise|equal opportunity employer|processus de recrutement|recruitment process|talent community|join our talent|nous recrutons)",
    )
    .unwrap()
});

/// Extracts a relative time value like "2" from "2 days ago" or "il y a 2 jours"
static RELATIVE_TIME_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(\d+)\s*(hour|heure|day|jour|week|semaine|month|mois)").unwrap()
});

pub struct GuestScraper {
    http: reqwest::Client,
    sem: Semaphore,
    is_authenticated: bool,
}

impl GuestScraper {
    pub fn new(http: reqwest::Client, concurrency: usize) -> Self {
        Self {
            http,
            sem: Semaphore::new(concurrency),
            is_authenticated: false,
        }
    }

    pub fn with_auth(mut self, authenticated: bool) -> Self {
        self.is_authenticated = authenticated;
        self
    }

    fn relative_to_ts(text: &str) -> Option<DateTime<Utc>> {
        let now = Utc::now();
        let lower = text.trim().to_lowercase();

        if lower.contains("just now")
            || lower.contains("à l'instant")
            || lower == "today"
            || lower == "aujourd'hui"
        {
            return Some(now);
        }

        if let Some(caps) = RELATIVE_TIME_RE.captures(&lower) {
            let num: i64 = caps.get(1)?.as_str().parse().ok()?;
            let unit = caps.get(2)?.as_str();

            let delta = match unit {
                "hour" | "heure" => TimeDelta::try_hours(num)?,
                "day" | "jour" => TimeDelta::try_days(num)?,
                "week" | "semaine" => TimeDelta::try_weeks(num)?,
                "month" | "mois" => TimeDelta::try_days(num * 30)?,
                _ => return None,
            };

            return Some(now - delta);
        }

        None
    }

    async fn fetch_listings(
        &self,
        keyword: &str,
        limit: u32,
    ) -> Vec<(String, String, String, String, Option<DateTime<Utc>>)> {
        let max_results = if self.is_authenticated {
            limit
        } else {
            limit.min(GUEST_BATCH_LIMIT)
        };

        let mut all_results = Vec::new();
        let mut start = 0u32;

        loop {
            let batch = GUEST_BATCH_LIMIT.min(max_results - all_results.len() as u32);
            if batch == 0 {
                break;
            }

            let ua = USER_AGENTS
                .choose(&mut rand::thread_rng())
                .unwrap_or(&USER_AGENTS[0]);
            let params = [
                ("keywords", keyword.to_string()),
                ("location", String::new()),
                ("start", start.to_string()),
                ("count", batch.to_string()),
            ];

            let resp = self
                .http
                .get(GUEST_API)
                .header("User-Agent", *ua)
                .header("Accept-Language", "fr-FR,fr;q=0.9")
                .query(&params)
                .send()
                .await;

            let html = match resp {
                Ok(r) if r.status().is_success() => r.text().await.unwrap_or_default(),
                _ => break,
            };

            let batch_results = Self::parse_listings(&html);
            if batch_results.is_empty() {
                break;
            }

            let remaining = max_results - all_results.len() as u32;
            for item in batch_results.into_iter().take(remaining as usize) {
                all_results.push(item);
            }

            if !self.is_authenticated || all_results.len() as u32 >= max_results {
                break;
            }

            start += GUEST_BATCH_LIMIT;
        }

        all_results
    }

    fn parse_listings(
        html: &str,
    ) -> Vec<(String, String, String, String, Option<DateTime<Utc>>)> {
        let doc = Html::parse_document(html);
        let card_sel = Selector::parse(".job-search-card").unwrap();
        let link_sel = Selector::parse("a.base-card__full-link").unwrap();
        let title_sel = Selector::parse(".base-search-card__title").unwrap();
        let company_sel = Selector::parse(".base-search-card__subtitle").unwrap();
        let location_sel = Selector::parse(".job-search-card__location").unwrap();
        let date_sel = Selector::parse(
            ".job-search-card__listdate, time, .job-search-card__listdate--new",
        )
        .unwrap();

        let mut results = Vec::new();

        for card in doc.select(&card_sel) {
            let href = card
                .select(&link_sel)
                .next()
                .and_then(|a| a.attr("href"))
                .unwrap_or("");

            if !href.contains("/jobs/view/") {
                continue;
            }

            let title = card
                .select(&title_sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            let company = card
                .select(&company_sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            if title.is_empty() || company.is_empty() {
                continue;
            }

            let location = card
                .select(&location_sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            let posted_at = card
                .select(&date_sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .and_then(|s| Self::relative_to_ts(&s));

            let url = href.split('?').next().unwrap_or(href).to_string();
            results.push((url, title, company, location, posted_at));
        }

        results
    }

    fn extract_job_id(url: &str) -> Option<String> {
        JOB_ID_RE
            .captures(url)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    async fn fetch_detail(&self, url: &str) -> Option<String> {
        let _permit = self.sem.acquire().await.ok()?;
        let ua = USER_AGENTS
            .choose(&mut rand::thread_rng())
            .unwrap_or(&USER_AGENTS[0]);

        let resp = self
            .http
            .get(url)
            .header("User-Agent", *ua)
            .header("Accept-Language", "fr-FR,fr;q=0.9")
            .send()
            .await
            .ok()?;

        if !resp.status().is_success() {
            return None;
        }

        let html = resp.text().await.ok()?;
        let doc = Html::parse_document(&html);
        let desc_sel = Selector::parse(r#"div[class*="description__text"]"#).ok()?;

        let text: String = doc
            .select(&desc_sel)
            .next()
            .map(|el| el.text().collect::<Vec<_>>().join("\n"))
            .unwrap_or_default();

        Some(Self::clean_description(&text))
    }

    fn clean_description(raw: &str) -> String {
        let cleaned = BOILERPLATE_RE
            .split(raw)
            .next()
            .unwrap_or(raw)
            .trim()
            .to_string();

        let re = Regex::new(r"\n{3,}").unwrap();
        re.replace_all(&cleaned, "\n\n").to_string()
    }
}

#[async_trait]
impl JobSource for GuestScraper {
    fn name(&self) -> &'static str {
        "linkedin_guest"
    }

    async fn search(&self, keyword: &str, limit: u32) -> Vec<RawJob> {
        let listings = self.fetch_listings(keyword, limit).await;
        let actual = listings.len().min(limit as usize);

        let mut jobs = Vec::with_capacity(actual);
        for (url, title, company, location, posted_at) in listings.iter().take(actual) {
            let description = self.fetch_detail(url).await.unwrap_or_default();
            jobs.push(RawJob {
                title: title.clone(),
                company: company.clone(),
                location: location.clone(),
                description,
                url: url.clone(),
                source: "linkedin_guest".into(),
                keyword: keyword.to_string(),
                posted_at: *posted_at,
            });
        }

        jobs
    }
}
