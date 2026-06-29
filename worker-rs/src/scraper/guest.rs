use crate::models::job::RawJob;
use crate::scraper::JobSource;
use async_trait::async_trait;
use rand::seq::SliceRandom;
use regex::Regex;
use scraper::{Html, Selector};
use std::sync::LazyLock;
use tokio::sync::Semaphore;

const GUEST_API: &str =
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

static USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

static JOB_ID_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"/jobs/view/.+-(\d+)").unwrap());

// Marqueurs de fin de description (boilerplate LinkedIn)
static BOILERPLATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)(about the company|a propos de l'entreprise|equal opportunity employer|processus de recrutement|recruitment process|talent community|join our talent|nous recrutons)",
    )
    .unwrap()
});

pub struct GuestScraper {
    http: reqwest::Client,
    sem: Semaphore,
}

impl GuestScraper {
    pub fn new(http: reqwest::Client, concurrency: usize) -> Self {
        Self {
            http,
            sem: Semaphore::new(concurrency),
        }
    }

    async fn fetch_listings(&self, keyword: &str, limit: u32) -> Vec<(String, String, String, String)> {
        let batch = limit.min(25);
        let ua = USER_AGENTS.choose(&mut rand::thread_rng()).unwrap_or(&USER_AGENTS[0]);
        let params = [
            ("keywords", keyword.to_string()),
            ("location", String::new()),
            ("start", "0".into()),
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
            _ => return vec![],
        };

        Self::parse_listings(&html)
    }

    fn parse_listings(html: &str) -> Vec<(String, String, String, String)> {
        let doc = Html::parse_document(html);
        let card_sel = Selector::parse(".job-search-card").unwrap();
        let link_sel = Selector::parse("a.base-card__full-link").unwrap();
        let title_sel = Selector::parse(".base-search-card__title").unwrap();
        let company_sel = Selector::parse(".base-search-card__subtitle").unwrap();
        let location_sel = Selector::parse(".job-search-card__location").unwrap();

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

            let url = href.split('?').next().unwrap_or(href).to_string();
            results.push((url, title, company, location));
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
        let ua = USER_AGENTS.choose(&mut rand::thread_rng()).unwrap_or(&USER_AGENTS[0]);

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

        // Réduit les sauts de ligne excessifs
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
        for (url, title, company, location) in listings.iter().take(actual) {
            let description = self.fetch_detail(url).await.unwrap_or_default();
            jobs.push(RawJob {
                title: title.clone(),
                company: company.clone(),
                location: location.clone(),
                description,
                url: url.clone(),
                source: "linkedin_guest".into(),
                keyword: keyword.to_string(),
                posted_at: None,
            });
        }

        jobs
    }
}
