use crate::models::job::RawJob;
use crate::scraper::JobSource;
use async_trait::async_trait;

/// Dorker scraper — stub. Le Dorking Google sera implémenté
/// quand le pipeline d'extraction en cascade (niveaux 1-4) sera défini.
/// Pour l'instant, retourne une liste vide sans erreur.
pub struct DorkerScraper;

#[async_trait]
impl JobSource for DorkerScraper {
    fn name(&self) -> &'static str {
        "dorker"
    }

    async fn search(&self, _keyword: &str, _limit: u32) -> Vec<RawJob> {
        vec![]
    }
}
