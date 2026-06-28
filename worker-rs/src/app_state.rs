use std::sync::Arc;

use crate::cache::Cache;
use crate::config::Config;
use crate::db::supabase::SupabaseClient;
use crate::quota::QuotaTracker;

/// État partagé unique — disponible dans tous les handlers via `State<Arc<AppState>>`.
pub struct AppState {
    pub http: reqwest::Client,
    pub config: Arc<Config>,
    pub db: Arc<SupabaseClient>,
    pub cache: Arc<Cache>,
    pub quota: Arc<QuotaTracker>,
}
