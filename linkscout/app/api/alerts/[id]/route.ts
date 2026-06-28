import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ alert: data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.keyword !== undefined) updates.keyword = body.keyword;
  if (body.platform !== undefined) {
    if (!["discord", "telegram"].includes(body.platform)) {
      return NextResponse.json(
        { error: "platform must be 'discord' or 'telegram'" },
        { status: 400 },
      );
    }
    updates.platform = body.platform;
  }
  if (body.webhook_url !== undefined) updates.webhook_url = body.webhook_url;
  if (body.filters !== undefined) updates.filters = body.filters;
  if (typeof body.min_score === "number") updates.min_score = body.min_score;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

  const { data, error } = await supabase
    .from("alerts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ alert: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[Alerts] Failed to delete alert:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
