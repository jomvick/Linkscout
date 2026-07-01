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

/** Return jobs, optionally filtered by keyword. degraded=true when served from memory cache. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() || null;

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
      const jobs = data.map((row) => mapJob(row as Record<string, unknown>));
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
    return NextResponse.json({ jobs: allJobs, degraded: true } satisfies JobsResponse);
  }
}
