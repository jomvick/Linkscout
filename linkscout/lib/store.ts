import type { Job } from "./types";

export type JobDraft = Omit<Job, "id" | "created_at"> &
  Partial<Pick<Job, "id" | "created_at">>;

const CACHE_TTL_MS = 15 * 60 * 1000;

interface Store {
  jobs: Job[];
  idCounter: number;
  totalScraped: number;
  lastUpdate: number;
}

declare global {
  var __linkscout_store: Store | undefined;
}

function getState(): Store {
  if (!globalThis.__linkscout_store) {
    globalThis.__linkscout_store = {
      jobs: [],
      idCounter: 0,
      totalScraped: 0,
      lastUpdate: Date.now(),
    };
  }
  return globalThis.__linkscout_store;
}

/** Return true if the cache was written before TTL and should be considered stale. */
export function isCacheExpired(): boolean {
  return Date.now() - getState().lastUpdate > CACHE_TTL_MS;
}

/** Return a copy of all jobs currently in the in-memory cache. */
export function getJobs(): Job[] {
  return [...getState().jobs];
}

/** Clear all cached jobs. */
export function clearCache(): void {
  const state = getState();
  state.jobs = [];
  state.lastUpdate = Date.now();
}

function findJobIndex(state: Store, job: JobDraft): number {
  if (job.id) {
    const byId = state.jobs.findIndex((existing) => existing.id === job.id);
    if (byId !== -1) return byId;
  }

  if (job.url) {
    const byUrl = state.jobs.findIndex((existing) => existing.url === job.url);
    if (byUrl !== -1) return byUrl;
  }

  return state.jobs.findIndex(
    (existing) =>
      existing.title === job.title && existing.company === job.company,
  );
}

/** Upsert an array of jobs into the in-memory cache. */
export function addJobs(newJobs: JobDraft[]): Job[] {
  const state = getState();
  const upserted: Job[] = [];

  for (const job of newJobs) {
    const existingIndex = findJobIndex(state, job);

    if (existingIndex !== -1) {
      const existing = state.jobs[existingIndex];
      const merged: Job = {
        ...existing,
        ...job,
        id: job.id || existing.id,
        created_at: job.created_at || existing.created_at,
      };
      state.jobs[existingIndex] = merged;
      continue;
    }

    const created: Job = {
      ...job,
      id: job.id || String(++state.idCounter),
      created_at: job.created_at || new Date().toISOString(),
    };

    state.jobs = [created, ...state.jobs];
    upserted.push(created);
  }

  state.totalScraped += upserted.length;
  state.lastUpdate = Date.now();
  return upserted;
}

/** Update a single job's fields by id in the in-memory cache. */
export function updateJob(id: string, fields: Partial<Job>): Job | null {
  const state = getState();
  const idx = state.jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  state.jobs[idx] = { ...state.jobs[idx], ...fields };
  return state.jobs[idx];
}

/** Return aggregate stats from the in-memory cache. */
export function getStats() {
  const state = getState();
  const companies = new Set(state.jobs.map((j) => j.company).filter(Boolean));
  return {
    totalScraped: state.totalScraped || state.jobs.length,
    uniqueCompanies: companies.size,
    lastUpdate: state.lastUpdate ?? Date.now(),
  };
}
