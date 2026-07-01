import type { Job } from "./types";

const GUEST_SESSION_KEY = "linkscout_guest_session";
const GUEST_TTL_MS = 30 * 60 * 1000;

export interface GuestSession {
  keyword: string;
  jobs: Job[];
  searched_at: number;
}

export const GuestSession = {
  save(keyword: string, jobs: Job[]) {
    const session: GuestSession = {
      keyword,
      jobs,
      searched_at: Date.now(),
    };
    try {
      sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    } catch {
      // sessionStorage peut être plein ou désactivé
    }
  },

  load(): GuestSession | null {
    try {
      const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
      if (!raw) return null;
      const session: GuestSession = JSON.parse(raw);
      if (Date.now() - session.searched_at > GUEST_TTL_MS) {
        sessionStorage.removeItem(GUEST_SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  updateJobs(jobs: Job[]) {
    const session = GuestSession.load();
    if (session) {
      GuestSession.save(session.keyword, jobs);
    }
  },

  clear() {
    try {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    } catch {
      // ignore
    }
  },
};
