use std::sync::Arc;

use crate::cache::CacheProvider;
use crate::config::Config;
use crate::db::supabase::SupabaseClient;
use crate::quota::QuotaProvider;

/// État partagé unique — disponible dans tous les handlers via `State<Arc<AppState>>`.
pub struct AppState {
    pub http: reqwest::Client,
    pub config: Arc<Config>,
    pub db: Arc<SupabaseClient>,
    pub cache: Arc<dyn CacheProvider>,
    pub quota: Arc<dyn QuotaProvider>,
}
