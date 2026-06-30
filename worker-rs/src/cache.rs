use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Durée de vie par défaut des entrées (minutes).
pub const DEFAULT_CACHE_TTL_MINUTES: u64 = 60;
/// Nombre maximum d'entrées dans le cache.
pub const DEFAULT_CACHE_MAX_ENTRIES: usize = 500;

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

    pub fn make_key(user_id: &str, prefix: &str, description: &str, keyword: &str) -> String {
        let mut hasher = DefaultHasher::new();
        description.hash(&mut hasher);
        keyword.hash(&mut hasher);
        format!("{}:{}:{:016x}", user_id, prefix, hasher.finish())
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let mut store = self.store.lock().unwrap();
        if let Some(entry) = store.get_mut(key) {
            if entry.expires_at > Instant::now() {
                entry.last_accessed = Instant::now();
                return Some(entry.value.clone());
            }
            store.remove(key);
        }
        None
    }

    pub fn set(&self, key: String, value: String) {
        let mut store = self.store.lock().unwrap();
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

    fn evict_lru(store: &mut HashMap<String, CacheEntry>) {
        let now = Instant::now();
        // Supprime d'abord les entrées expirées.
        store.retain(|_, entry| entry.expires_at > now);

        // Si toujours plein, supprime l'entrée la moins récemment utilisée.
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

    pub fn invalidate_user(&self, user_id: &str) {
        let mut store = self.store.lock().unwrap();
        store.retain(|k, _| !k.starts_with(&format!("{}:", user_id)));
    }

    pub fn len(&self) -> usize {
        let mut store = self.store.lock().unwrap();
        let now = Instant::now();
        store.retain(|_, entry| entry.expires_at > now);
        store.len()
    }
}
