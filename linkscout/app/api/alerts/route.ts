import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Alerts] Failed to load alerts:", error);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }

  return NextResponse.json({ alerts: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, keyword, platform, webhook_url, filters, min_score } = body;

  if (!title || !keyword || !platform || !webhook_url) {
    return NextResponse.json(
      { error: "title, keyword, platform, and webhook_url are required" },
      { status: 400 },
    );
  }

  if (!["discord", "telegram"].includes(platform)) {
    return NextResponse.json(
      { error: "platform must be 'discord' or 'telegram'" },
      { status: 400 },
    );
  }

  if (platform === "discord" && !webhook_url.startsWith("https://discord.com/api/webhooks/")) {
    return NextResponse.json(
      { error: "Invalid Discord webhook URL" },
      { status: 400 },
    );
  }

  if (platform === "telegram") {
    const parts = webhook_url.split("|||");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      return NextResponse.json(
        { error: "Telegram requires token|||chat_id format" },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      title,
      keyword,
      platform,
      webhook_url,
      filters: filters || {},
      min_score: typeof min_score === "number" ? min_score : 70,
    })
    .select()
    .single();

  if (error) {
    console.error("[Alerts] Failed to create alert:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}
