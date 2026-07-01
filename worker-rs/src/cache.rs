use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub const DEFAULT_CACHE_TTL_MINUTES: u64 = 60;
pub const DEFAULT_CACHE_MAX_ENTRIES: usize = 500;

/// Trait asynchrone partagé pour tous les backends de cache.
#[async_trait::async_trait]
pub trait CacheProvider: Send + Sync {
    async fn get(&self, key: &str) -> Option<String>;
    async fn set(&self, key: String, value: String);
}

/// Génère une clé de cache déterministe pour les résultats de scraping.
pub fn make_cache_key(user_id: &str, prefix: &str, description: &str, keyword: &str) -> String {
    let mut hasher = DefaultHasher::new();
    description.hash(&mut hasher);
    keyword.hash(&mut hasher);
    format!("cache:jobs:{}:{}:{:016x}", user_id, prefix, hasher.finish())
}

/// Cache mémoire simple avec TTL et éviction LRU.
pub struct Cache {
    store: Mutex<HashMap<String, CacheEntry>>,
    ttl: Duration,
    max_entries: usize,
}

struct CacheEntry {
    value: String,
    expires_at: Instant,
    last_accessed: Instant,
}

impl Cache {
    pub fn new(ttl_minutes: u64, max_entries: usize) -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
            ttl: Duration::from_secs(ttl_minutes * 60),
            max_entries,
        }
    }
}

#[async_trait::async_trait]
impl CacheProvider for Cache {
    async fn get(&self, key: &str) -> Option<String> {
        let mut store = self.store.lock().expect("cache mutex poisoned");
        if let Some(entry) = store.get_mut(key) {
            if entry.expires_at > Instant::now() {
                entry.last_accessed = Instant::now();
                return Some(entry.value.clone());
            }
            store.remove(key);
        }
        None
    }

    async fn set(&self, key: String, value: String) {
        let mut store = self.store.lock().expect("cache mutex poisoned");
        if store.len() >= self.max_entries {
            Self::evict_lru(&mut store);
        }
        let now = Instant::now();
        store.insert(
            key,
            CacheEntry {
                value,
                expires_at: now + self.ttl,
                last_accessed: now,
            },
        );
    }
}

impl Cache {
    fn evict_lru(store: &mut HashMap<String, CacheEntry>) {
        let now = Instant::now();
        store.retain(|_, entry| entry.expires_at > now);

        if store.len() >= DEFAULT_CACHE_MAX_ENTRIES {
            if let Some(oldest_key) = store
                .iter()
                .min_by_key(|(_, entry)| entry.last_accessed)
                .map(|(key, _)| key.clone())
            {
                store.remove(&oldest_key);
            }
        }
    }
}
