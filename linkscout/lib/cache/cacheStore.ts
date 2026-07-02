interface CacheWrapper<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = "linkscout_cache_";
const LOCAL_PREFIX = "linkscout_local_";

/** Client-side cache backed by sessionStorage and localStorage with TTL support. */
export const cacheStore = {
  /** Store a value in sessionStorage with a TTL (default 15 min). */
  setSession<T>(key: string, value: T, ttlInMinutes = 15): void {
    if (typeof window === "undefined") return;
    const data: CacheWrapper<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttlInMinutes * 60 * 1000,
    };
    try {
      sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch { /* quota exceeded — ignore */ }
  },

  /** Retrieve a sessionStorage value; returns null if expired or missing. */
  getSession<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    try {
      const data: CacheWrapper<T> = JSON.parse(raw);
      if (Date.now() - data.timestamp > data.ttl) {
        sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      return data.value;
    } catch (error) {
      console.error("[Cache] Parse error for key %s: %O", key, error);
      return null;
    }
  },

  removeSession(key: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
  },

  /** Persist a value in localStorage (no TTL — survives sessions). */
  setLocal<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${LOCAL_PREFIX}${key}`, JSON.stringify(value));
    } catch { /* quota exceeded — ignore */ }
  },

  /** Retrieve a localStorage value. */
  getLocal<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`${LOCAL_PREFIX}${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  removeLocal(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`${LOCAL_PREFIX}${key}`);
  },

  /** Clear all cached entries from both sessionStorage and localStorage. */
  clearAll(): void {
    if (typeof window === "undefined") return;
    const clean = (storage: Storage, prefix: string) => {
      Object.keys(storage)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => storage.removeItem(k));
    };
    clean(sessionStorage, CACHE_PREFIX);
    clean(localStorage, LOCAL_PREFIX);
  },
};
