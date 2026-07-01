use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use serde::{Deserialize, Serialize};

pub const QUOTA_MAX_PER_WINDOW: u32 = 100;
pub const QUOTA_WINDOW_MINUTES: u64 = 1440;
pub const GUEST_MAX_CREDITS: i64 = 5;

/// Trait asynchrone partagé pour tous les backends de quota.
#[async_trait::async_trait]
pub trait QuotaProvider: Send + Sync {
    async fn check_and_increment(&self, user_id: &str) -> Result<QuotaInfo, QuotaInfo>;
    async fn peek(&self, user_id: &str) -> QuotaInfo;
    async fn reset_user(&self, user_id: &str);

    /// Vérifie et consomme un crédit guest. Retourne false si quota épuisé.
    async fn check_and_consume_guest_quota(&self, guest_id: &str, limit: i64) -> bool;
    /// Retourne le nombre de crédits restants pour un guest.
    async fn get_remaining_credits(&self, guest_id: &str, max_credits: i64) -> i64;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaInfo {
    pub used: u32,
    pub limit: u32,
    pub remaining: u32,
    pub resets_in_secs: u64,
}

/// Suivi des quotas API par utilisateur en mémoire.
pub struct QuotaTracker {
    store: Mutex<HashMap<String, UserQuota>>,
    max_per_window: u32,
    window_secs: u64,
}

struct UserQuota {
    count: u32,
    window_start: Instant,
}

impl QuotaTracker {
    pub fn new(max_per_window: u32, window_minutes: u64) -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
            max_per_window,
            window_secs: window_minutes * 60,
        }
    }
}

#[async_trait::async_trait]
impl QuotaProvider for QuotaTracker {
    async fn check_and_increment(&self, user_id: &str) -> Result<QuotaInfo, QuotaInfo> {
        let mut store = self.store.lock().expect("quota mutex poisoned");
        let quota = Self::get_or_create_quota(&mut store, self.window_secs, user_id);
        quota.count += 1;
        let info = Self::build_quota_info(quota, self.max_per_window, self.window_secs);
        if quota.count > self.max_per_window {
            Err(info)
        } else {
            Ok(info)
        }
    }

    async fn peek(&self, user_id: &str) -> QuotaInfo {
        let mut store = self.store.lock().expect("quota mutex poisoned");
        let quota = Self::get_or_create_quota(&mut store, self.window_secs, user_id);
        Self::build_quota_info(quota, self.max_per_window, self.window_secs)
    }

    async fn reset_user(&self, user_id: &str) {
        self.store.lock().unwrap().remove(user_id);
    }

    async fn check_and_consume_guest_quota(&self, guest_id: &str, limit: i64) -> bool {
        let mut store = self.store.lock().expect("quota mutex poisoned");
        let quota = Self::get_or_create_quota(&mut store, self.window_secs, guest_id);
        if quota.count as i64 >= limit {
            return false;
        }
        quota.count += 1;
        true
    }

    async fn get_remaining_credits(&self, guest_id: &str, max_credits: i64) -> i64 {
        let store = self.store.lock().expect("quota mutex poisoned");
        if let Some(quota) = store.get(guest_id) {
            max_credits - quota.count as i64
        } else {
            max_credits
        }
    }
}

impl QuotaTracker {
    fn get_or_create_quota<'a>(
        store: &'a mut HashMap<String, UserQuota>,
        window_secs: u64,
        user_id: &str,
    ) -> &'a mut UserQuota {
        let now = Instant::now();
        let quota = store.entry(user_id.to_string()).or_insert(UserQuota {
            count: 0,
            window_start: now,
        });
        if now.duration_since(quota.window_start).as_secs() >= window_secs {
            quota.count = 0;
            quota.window_start = now;
        }
        quota
    }

    fn build_quota_info(quota: &UserQuota, max_per_window: u32, window_secs: u64) -> QuotaInfo {
        let resets_in_secs = window_secs.saturating_sub(
            Instant::now().duration_since(quota.window_start).as_secs(),
        );
        QuotaInfo {
            used: quota.count,
            limit: max_per_window,
            remaining: max_per_window.saturating_sub(quota.count),
            resets_in_secs,
        }
    }
}
