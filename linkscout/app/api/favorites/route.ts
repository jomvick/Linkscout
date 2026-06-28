import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ favorites: [] });
    }

    const { data } = await supabase
      .from("collections")
      .select("job_id")
      .eq("user_id", user.id)
      .eq("status", "bookmarked");

    return NextResponse.json({
      favorites: (data ?? []).map((r) => r.job_id),
    });
  } catch {
    return NextResponse.json({ favorites: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const { jobId, action } = await request.json();
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "jobId requis." }, { status: 400 });
    }

    if (action === "remove") {
      await supabase
        .from("collections")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId)
        .eq("status", "bookmarked");
    } else {
      await supabase
        .from("collections")
        .upsert(
          { user_id: user.id, job_id: jobId, status: "bookmarked", updated_at: new Date().toISOString() },
          { onConflict: "user_id,job_id" },
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Favorites] Error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
