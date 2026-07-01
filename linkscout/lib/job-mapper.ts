/**
 * job-mapper.ts — Single source of truth for mapping raw DB/API records to Job objects.
 *
 * Used by:
 *  - server-jobs.ts (SSR / API routes)
 *  - DashboardContext.tsx (client, after scrape)
 *  - HeroSection.tsx (client, after scrape)
 *  - HistoryView.tsx (client, from DB)
 */
import type { Job } from "./types";

export type JobDraftRecord = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function strArrOrNull(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return arr.length > 0 ? arr : null;
}

function jobStatus(v: unknown): Job["status"] {
  return v === "enriched" || v === "archived" ? v : "new";
}

export function mapJob(row: JobDraftRecord): Job {
  const breakdown = (typeof row.score_breakdown === "object" && row.score_breakdown !== null)
    ? (row.score_breakdown as Record<string, unknown>)
    : null;

  return {
    id: str(row.id),
    title: str(row.title),
    company: str(row.company),
    description: strOrNull(row.description),
    url: strOrNull(row.url),
    source: str(row.source) || "linkedin",
    status: jobStatus(row.status),
    created_at: str(row.created_at) || new Date().toISOString(),
    logo_url: strOrNull(row.logo_url),
    match_score: numOrNull(row.match_score),
    summary: strOrNull(row.summary),
    tech_stack: strArrOrNull(row.tech_stack),
    salary: strOrNull(row.salary) ?? strOrNull(row.estimated_salary),
    location: strOrNull(row.location),
    contract_type: strOrNull(row.contract_type),
    remote_policy: strOrNull(row.remote_policy),
    seniority: strOrNull(row.seniority),
    pitch: strOrNull(row.pitch),
    score_breakdown: breakdown
      ? {
          keyword_alignment: numOrNull(breakdown.keyword_alignment),
          skills_match: numOrNull(breakdown.skills_match),
          seniority_match: numOrNull(breakdown.seniority_match),
        }
      : null,
    verdict_ai: strOrNull(row.verdict_ai),
    score_coherence_generale: numOrNull(row.score_coherence_generale),
    score_coherence_cv: numOrNull(row.score_coherence_cv),
  };
}
