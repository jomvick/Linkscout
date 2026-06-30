use crate::models::job::{GeneratedPitch, JobAnalysis};
use async_trait::async_trait;

#[async_trait]
pub trait LlmProvider: Send + Sync {
    #[allow(dead_code)]
    fn name(&self) -> &'static str;
    async fn analyze(
        &self,
        title: &str,
        company: &str,
        description: &str,
        keyword: &str,
        resume_text: &str,
    ) -> Option<JobAnalysis>;

    async fn generate_pitch(
        &self,
        title: &str,
        company: &str,
        description: &str,
    ) -> Option<GeneratedPitch>;
}
