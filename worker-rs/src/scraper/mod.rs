pub mod guest;
pub mod apify;
pub mod dorker;

use crate::models::job::RawJob;
use async_trait::async_trait;

/// Contrat commun à toutes les sources d'extraction.
#[async_trait]
pub trait JobSource: Send + Sync {
    fn name(&self) -> &'static str;
    async fn search(&self, keyword: &str, limit: u32) -> Vec<RawJob>;
}

/// Pipeline qui interroge une source puis enrichit les résultats bruts.
pub struct ExtractionPipeline {
    pub source: Box<dyn JobSource>,
}

impl ExtractionPipeline {
    pub fn new(source: Box<dyn JobSource>) -> Self {
        Self { source }
    }

    pub async fn run(&self, keyword: &str, limit: u32) -> Vec<RawJob> {
        self.source.search(keyword, limit).await
    }
}
