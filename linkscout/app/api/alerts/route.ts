import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const alertCreateSchema = z.object({
  title: z.string().trim().min(1, "title requis"),
  keyword: z.string().trim().min(1, "keyword requis"),
  platform: z.enum(["discord", "telegram"]),
  webhook_url: z.string().trim().min(1, "webhook_url requis"),
  filters: z.record(z.string(), z.unknown()).optional(),
  min_score: z.number().min(0).max(100).optional(),
});

export async function GET() {
  try {
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
  } catch (err) {
    console.error("[Alerts] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }
    const parsed = alertCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation échouée",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { title, keyword, platform, webhook_url, filters, min_score } = parsed.data;

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
  } catch (err) {
    console.error("[Alerts] POST error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
