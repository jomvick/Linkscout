import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("search_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[History] Failed to load search history:", error);
    return NextResponse.json({ error: "Failed to load search history" }, { status: 500 });
  }

  return NextResponse.json({ history: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = body;

  if (id) {
    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[History] Failed to delete search history item:", error);
      return NextResponse.json({ error: "Failed to delete search history" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("search_history")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[History] Failed to clear search history:", error);
    return NextResponse.json({ error: "Failed to clear search history" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
