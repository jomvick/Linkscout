import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("use_resume_match, active_resume_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    settings: data || { use_resume_match: false, active_resume_id: null },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { use_resume_match, active_resume_id } = body;

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        use_resume_match: typeof use_resume_match === "boolean" ? use_resume_match : false,
        active_resume_id: typeof active_resume_id === "string" ? active_resume_id : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, settings: data });
}
