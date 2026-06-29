import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const favoriteSchema = z.object({
  jobId: z.string().min(1, "jobId requis"),
  action: z.enum(["add", "remove"]).optional().default("add"),
});

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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }
    const parsed = favoriteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { jobId, action } = parsed.data;

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
