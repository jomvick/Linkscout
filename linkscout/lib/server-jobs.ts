import { getJobs, updateJob } from "./store";
import type { Job } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapJob } from "./job-mapper";

type UnknownRecord = Record<string, unknown>;

/** @deprecated Use mapJob from lib/job-mapper instead. Kept for backward compat. */
export const mapJobRecord = mapJob;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = SupabaseClient<any, any, any, any, any>;

export async function resolveJobFromPayload(
  payload: UnknownRecord,
  maybeSupabase?: DbClient | null,
): Promise<Job | null> {
  const jobPayload = typeof payload.job === "object" && payload.job !== null
    ? (payload.job as UnknownRecord)
    : null;

  if (jobPayload) {
    return mapJobRecord(jobPayload);
  }

  const jobId = typeof payload.jobId === "string" ? payload.jobId : null;
  if (!jobId) {
    return null;
  }

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
      // Fall back to in-memory store below.
    }
  }

  return getJobs().find((job) => job.id === jobId) ?? null;
}

export async function persistJobUpdate(
  jobId: string | undefined,
  fields: Partial<Job>,
  maybeSupabase?: DbClient | null,
): Promise<Job | null> {
  if (!jobId) {
    return null;
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
        if (dbPatch[key] === undefined) {
          delete dbPatch[key];
        }
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
          return mapped;
        }
      }
    } catch {
      // Fall back to in-memory update below.
    }
  }

  return updateJob(jobId, fields);
}
