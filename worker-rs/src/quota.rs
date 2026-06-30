use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use serde::{Deserialize, Serialize};

/// Suivi des quotas API par utilisateur.
/// Thread-safe, reset périodique.
pub struct QuotaTracker {
    store: Mutex<HashMap<String, UserQuota>>,
    /// Nombre max d'appels autorisés par fenêtre
    max_per_window: u32,
    /// Durée de la fenêtre (secondes)
    window_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaInfo {
    pub used: u32,
    pub limit: u32,
    pub remaining: u32,
    pub resets_in_secs: u64,
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

    /// Vérifie si l'utilisateur peut effectuer un appel.
    /// Si oui, incrémente le compteur et retourne Ok(QuotaInfo).
    /// Si non, retourne Err(QuotaInfo) avec remaining = 0.
    pub fn check_and_increment(&self, user_id: &str) -> Result<QuotaInfo, QuotaInfo> {
        let now = Instant::now();
        let mut store = self.store.lock().unwrap();

        let quota = store.entry(user_id.to_string()).or_insert(UserQuota {
            count: 0,
            window_start: now,
        });

        if now.duration_since(quota.window_start).as_secs() >= self.window_secs {
            quota.count = 0;
            quota.window_start = now;
        }

        quota.count += 1;
        let used = quota.count;
        let remaining = if used > self.max_per_window {
            0
        } else {
            self.max_per_window - used
        };
        let resets_in_secs = self.window_secs.saturating_sub(
            now.duration_since(quota.window_start).as_secs(),
        );

        let info = QuotaInfo {
            used,
            limit: self.max_per_window,
            remaining,
            resets_in_secs,
        };

        if used > self.max_per_window {
            Err(info)
        } else {
            Ok(info)
        }
    }

    /// Retourne les infos quota sans incrémenter.
    pub fn peek(&self, user_id: &str) -> QuotaInfo {
        let now = Instant::now();
        let mut store = self.store.lock().unwrap();

        let quota = store.entry(user_id.to_string()).or_insert(UserQuota {
            count: 0,
            window_start: now,
        });

        if now.duration_since(quota.window_start).as_secs() >= self.window_secs {
            quota.count = 0;
            quota.window_start = now;
        }

        let remaining = self.max_per_window.saturating_sub(quota.count);
        let resets_in_secs = self.window_secs.saturating_sub(
            now.duration_since(quota.window_start).as_secs(),
        );

        QuotaInfo {
            used: quota.count,
            limit: self.max_per_window,
            remaining,
            resets_in_secs,
        }
    }

    #[allow(dead_code)]
    pub fn reset_user(&self, user_id: &str) {
        self.store.lock().unwrap().remove(user_id);
    }
}
