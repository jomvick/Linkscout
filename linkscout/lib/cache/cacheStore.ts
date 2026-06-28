interface CacheWrapper<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = "linkscout_cache_";
const LOCAL_PREFIX = "linkscout_local_";

export const cacheStore = {
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
      console.error(`[Cache] Parse error for key ${key}:`, error);
      return null;
    }
  },

  removeSession(key: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
  },

  setLocal<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${LOCAL_PREFIX}${key}`, JSON.stringify(value));
    } catch { /* quota exceeded — ignore */ }
  },

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
