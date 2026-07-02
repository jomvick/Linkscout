import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isRelativeUrl(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const redirectTo = next && isRelativeUrl(next) ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
