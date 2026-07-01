use std::sync::Arc;

use crate::quota::{QuotaInfo, QuotaProvider};
use redis::aio::MultiplexedConnection;
use redis::AsyncCommands;

pub const QUOTA_WINDOW_SECS: u64 = 86400; // 24h

/// Suivi des quotas via Redis (INCR + EXPIRE).
pub struct RedisQuota {
    conn: Arc<tokio::sync::Mutex<MultiplexedConnection>>,
    max_per_window: u32,
}

impl RedisQuota {
    pub fn new(conn: MultiplexedConnection, max_per_window: u32) -> Self {
        Self {
            conn: Arc::new(tokio::sync::Mutex::new(conn)),
            max_per_window,
        }
    }

    fn user_key(user_id: &str) -> String {
        format!("quota:user:{}", user_id)
    }

    fn guest_key(guest_id: &str) -> String {
        format!("quota:guest:{}", guest_id)
    }
}

#[async_trait::async_trait]
impl QuotaProvider for RedisQuota {
    async fn check_and_increment(&self, user_id: &str) -> Result<QuotaInfo, QuotaInfo> {
        let key = Self::user_key(user_id);
        let mut conn = self.conn.lock().await;

        let count: u32 = conn.incr(&key, 1).await.unwrap_or(1);
        if count == 1 {
            let _: Result<(), _> = conn.expire(&key, QUOTA_WINDOW_SECS as i64).await;
        }

        let ttl: i64 = conn.ttl(&key).await.unwrap_or(QUOTA_WINDOW_SECS as i64);
        let remaining = self.max_per_window.saturating_sub(count);
        let info = QuotaInfo {
            used: count,
            limit: self.max_per_window,
            remaining,
            resets_in_secs: ttl.max(0) as u64,
        };

        if count > self.max_per_window {
            Err(info)
        } else {
            Ok(info)
        }
    }

    async fn peek(&self, user_id: &str) -> QuotaInfo {
        let key = Self::user_key(user_id);
        let mut conn = self.conn.lock().await;

        let count: u32 = conn.get(&key).await.unwrap_or(0);
        let ttl: i64 = conn.ttl(&key).await.unwrap_or(QUOTA_WINDOW_SECS as i64);

        QuotaInfo {
            used: count,
            limit: self.max_per_window,
            remaining: self.max_per_window.saturating_sub(count),
            resets_in_secs: ttl.max(0) as u64,
        }
    }

    async fn reset_user(&self, user_id: &str) {
        let key = Self::user_key(user_id);
        let mut conn = self.conn.lock().await;
        let _: Result<(), _> = conn.del(&key).await;
    }

    async fn check_and_consume_guest_quota(&self, guest_id: &str, limit: i64) -> bool {
        let key = Self::guest_key(guest_id);
        let mut conn = self.conn.lock().await;

        let current: Option<i64> = conn.get(&key).await.unwrap_or(None);
        match current {
            Some(count) => {
                if count >= limit {
                    return false;
                }
                let _: Result<(), _> = conn.incr(&key, 1).await;
                true
            }
            None => {
                let _: Result<(), _> = conn.set(&key, 1).await;
                let _: Result<(), _> = conn.expire(&key, QUOTA_WINDOW_SECS as i64).await;
                true
            }
        }
    }

    async fn get_remaining_credits(&self, guest_id: &str, max_credits: i64) -> i64 {
        let key = Self::guest_key(guest_id);
        let mut conn = self.conn.lock().await;
        let current: Option<i64> = conn.get(&key).await.unwrap_or(None);
        max_credits - current.unwrap_or(0)
    }
}
