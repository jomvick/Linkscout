import { NextRequest, NextResponse } from "next/server";
import { mapJob } from "@/lib/job-mapper";
import { getJobs } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

interface JobsResponse {
  jobs: Job[];
  degraded: boolean;
}

function computeWeightedScore(job: Job): number {
  const gen = job.score_coherence_generale;
  const cv = job.score_coherence_cv;
  if (gen !== null && cv !== null) return gen * 0.3 + cv * 0.7;
  if (gen !== null) return gen;
  if (cv !== null) return cv;
  return job.match_score ?? 0;
}

/** Return jobs, optionally filtered by keyword. degraded=true when served from memory cache. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() || null;
  const useResumeMatch = searchParams.get("use_resume_match") === "true";

  try {
    const supabase = await createClient();

    let query = supabase.from("jobs").select("*");
    if (keyword) {
      query = query.ilike("title", `%${keyword}%`);
    }
    const { data, error } = await query
      .order("match_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      let jobs = data.map((row) => mapJob(row as Record<string, unknown>));
      if (useResumeMatch) {
        jobs = jobs.sort((a, b) => computeWeightedScore(b) - computeWeightedScore(a));
      }
      return NextResponse.json({ jobs, degraded: false } satisfies JobsResponse);
    }

    // Degraded: serve from in-memory cache (guest or DB unavailable)
    let allJobs = getJobs();
    if (keyword) {
      const kw = keyword.toLowerCase();
      allJobs = allJobs.filter(
        (j) =>
          j.title.toLowerCase().includes(kw) ||
          j.company.toLowerCase().includes(kw),
      );
    }
    if (useResumeMatch) {
      allJobs = allJobs.sort((a, b) => computeWeightedScore(b) - computeWeightedScore(a));
    }
    return NextResponse.json({ jobs: allJobs, degraded: true } satisfies JobsResponse);
  } catch (err) {
    console.error("[Jobs] GET error:", err);
    let allJobs = getJobs();
    const kw = keyword?.toLowerCase();
    if (kw) {
      allJobs = allJobs.filter(
        (j) =>
          j.title.toLowerCase().includes(kw) ||
          j.company.toLowerCase().includes(kw),
      );
    }
    if (useResumeMatch) {
      allJobs = allJobs.sort((a, b) => computeWeightedScore(b) - computeWeightedScore(a));
    }
    return NextResponse.json({ jobs: allJobs, degraded: true } satisfies JobsResponse);
  }
}
