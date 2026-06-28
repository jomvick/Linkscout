import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: `Auth error: ${authErr.message}` }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { storage_path, file_name } = body;
    if (!storage_path || !file_name) {
      return NextResponse.json({ error: "Missing storage_path or file_name" }, { status: 422 });
    }

    // Upsert resume (one per user) — delete old storage file if replacing
    const { data: existing } = await supabase
      .from("resumes")
      .select("id, storage_path")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage.from("resumes").remove([existing.storage_path]);
    }

    const { data, error } = await supabase
      .from("resumes")
      .upsert(
        {
          user_id: user.id,
          status: "uploaded",
          storage_path,
          file_name,
        },
        { onConflict: "user_id", ignoreDuplicates: false },
      )
      .select()
      .single();

    if (error) {
      console.error("Resume upsert error:", JSON.stringify(error));
      return NextResponse.json({ error: `Upsert error: ${error.message}`, details: error }, { status: 500 });
    }

    // Fire-and-forget to worker for processing
    const { data: sessionData } = await supabase.auth.getSession();
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8001";
    const accessToken = sessionData.session?.access_token;
    if (accessToken) {
      fetch(`${workerUrl}/resume/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          resume_id: data.id,
          storage_path,
          file_name,
        }),
      }).catch((err) => console.error("Worker fire-and-forget failed:", err));
    }

    return NextResponse.json({
      success: true,
      resume: data,
      processing: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Unexpected: ${msg}` }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    resume: data || null,
    settings: { use_resume_match: false, active_resume_id: null },
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete from storage first
  const current = await supabase.from("resumes").select("storage_path").eq("user_id", user.id).maybeSingle();
  if (current.data?.storage_path) {
    await supabase.storage.from("resumes").remove([current.data.storage_path]);
  }

  const { error } = await supabase.from("resumes").delete().eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
