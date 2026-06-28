import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const addSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  minScore: z.number().min(0).max(100).default(80),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service client not configured" }, { status: 500 });
    }

    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const body = await request.json();
    const validation = addSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { userId, jobId } = validation.data;

    const { error: dbError } = await supabase
      .from("collections")
      .upsert(
        { user_id: userId, job_id: jobId, status: "bookmarked", updated_at: new Date().toISOString() },
        { onConflict: "user_id,job_id" },
      );

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Auto-Add] Error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
