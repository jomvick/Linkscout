import { getJobs, updateJob } from "./store";
import type { Job } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapJob } from "./job-mapper";

type UnknownRecord = Record<string, unknown>;

type DbClient = SupabaseClient;

/** Resolve a Job from a payload (inline job data, DB lookup, or cache fallback). */
export async function resolveJobFromPayload(
  payload: UnknownRecord,
  maybeSupabase?: DbClient | null,
): Promise<Job | null> {
  const jobPayload =
    typeof payload.job === "object" && payload.job !== null
      ? (payload.job as UnknownRecord)
      : null;

  if (jobPayload) {
    return mapJobRecord(jobPayload);
  }

  const jobId = typeof payload.jobId === "string" ? payload.jobId : null;
  if (!jobId) return null;

  // 1. Primary: Supabase
  const client = maybeSupabase ?? null;
  if (client) {
    try {
      const { data, error } = await client
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (!error && data) {
        return mapJobRecord(data as UnknownRecord);
      }
    } catch {
      // fall through to cache
    }
  }

  // 2. Fallback: in-memory cache
  return getJobs().find((job) => job.id === jobId) ?? null;
}

/** Persist job field updates to Supabase with degraded cache fallback. */
export async function persistJobUpdate(
  jobId: string | undefined,
  fields: Partial<Job>,
  maybeSupabase?: DbClient | null,
): Promise<{ job: Job | null; degraded: boolean }> {
  if (!jobId) {
    return { job: null, degraded: false };
  }

  const client = maybeSupabase ?? null;
  if (client) {
    try {
      const dbPatch: Record<string, unknown> = {
        summary: fields.summary,
        tech_stack: fields.tech_stack,
        salary: fields.salary,
        location: fields.location,
        contract_type: fields.contract_type,
        remote_policy: fields.remote_policy,
        seniority: fields.seniority,
        match_score: fields.match_score,
        score_breakdown: fields.score_breakdown,
        verdict_ai: fields.verdict_ai,
        status: fields.status,
        logo_url: fields.logo_url,
        pitch: fields.pitch,
      };

      Object.keys(dbPatch).forEach((key) => {
        if (dbPatch[key] === undefined) delete dbPatch[key];
      });

      if (Object.keys(dbPatch).length > 0) {
        const { data, error } = await client
          .from("jobs")
          .update(dbPatch)
          .eq("id", jobId)
          .select("*")
          .maybeSingle();

        if (!error && data) {
          const mapped = mapJobRecord(data as UnknownRecord);
          updateJob(jobId, mapped);
          return { job: mapped, degraded: false };
        }
      }
    } catch {
      // fall through to cache
    }
  }

  // Degraded: cache-only update (guest or DB unavailable)
  const cached = updateJob(jobId, fields);
  return { job: cached, degraded: true };
}

/** @deprecated Use mapJob from lib/job-mapper instead. Kept for backward compat. */
export const mapJobRecord = mapJob;
