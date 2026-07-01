use std::sync::Arc;

use crate::cache::CacheProvider;
use redis::aio::MultiplexedConnection;
use redis::AsyncCommands;

pub const REDIS_CACHE_DEFAULT_TTL: u64 = 1800; // 30 min

/// Cache Redis avec TTL automatique (SETEX/GET).
pub struct RedisCache {
    conn: Arc<tokio::sync::Mutex<MultiplexedConnection>>,
    ttl_secs: u64,
}

impl RedisCache {
    pub fn new(conn: MultiplexedConnection) -> Self {
        Self {
            conn: Arc::new(tokio::sync::Mutex::new(conn)),
            ttl_secs: REDIS_CACHE_DEFAULT_TTL,
        }
    }

    pub fn with_ttl(mut self, ttl_secs: u64) -> Self {
        self.ttl_secs = ttl_secs;
        self
    }
}

#[async_trait::async_trait]
impl CacheProvider for RedisCache {
    async fn get(&self, key: &str) -> Option<String> {
        let mut conn = self.conn.lock().await;
        conn.get::<_, Option<String>>(key).await.ok()?
    }

    async fn set(&self, key: String, value: String) {
        let mut conn = self.conn.lock().await;
        let _: Result<(), _> = conn.set_ex(key, value, self.ttl_secs).await;
    }
}
