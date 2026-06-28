import { NextRequest, NextResponse } from "next/server";
import { mapJob } from "@/lib/job-mapper";
import { getJobs } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Suppress unused var warning — kept for future filtering
  void request;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("match_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (!error && data) {
    const jobs = data.map((row) => mapJob(row as Record<string, unknown>));
    return NextResponse.json(jobs);
  }

  // Fallback: in-memory store (dev mode or DB unavailable)
  return NextResponse.json(getJobs());
}
