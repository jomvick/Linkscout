use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Cache mémoire simple avec TTL.
pub struct Cache {
    store: Mutex<HashMap<String, CacheEntry>>,
    ttl: Duration,
    max_entries: usize,
}

struct CacheEntry {
    value: String,
    expires_at: Instant,
}

impl Cache {
    #[allow(dead_code)]
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
        if let Some(entry) = store.get(key) {
            if entry.expires_at > Instant::now() {
                return Some(entry.value.clone());
            }
            store.remove(key);
        }
        None
    }

    pub fn set(&self, key: String, value: String) {
        let mut store = self.store.lock().unwrap();
        if store.len() >= self.max_entries {
            store.clear();
        }
        store.insert(
            key,
            CacheEntry {
                value,
                expires_at: Instant::now() + self.ttl,
            },
        );
    }

    #[allow(dead_code)]
    pub fn invalidate_user(&self, user_id: &str) {
        let mut store = self.store.lock().unwrap();
        store.retain(|k, _| !k.starts_with(&format!("{}:", user_id)));
    }

    #[allow(dead_code)]
    pub fn len(&self) -> usize {
        self.store.lock().unwrap().len()
    }
}
