import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY) {
    console.warn("[AutoConfirm] Unauthorized request");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const validation = requestSchema.safeParse(await req.json());
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return NextResponse.json({ success: false, error: "Service key not configured" }, { status: 500 });
  }

  const admin = createClient(url, key, {
    db: { schema: "public" },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { userId } = validation.data;
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    console.error("[AutoConfirm] Supabase admin update failed:", error);
    return NextResponse.json({ success: false, error: "Failed to confirm user" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
