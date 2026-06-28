import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes accessibles en mode "invité" (résultats d'une recherche landing, ?q=...)
// → Lecture seule des offres. Toute navigation vers favoris/historique/settings
//   redirige vers /login.
const GUEST_ALLOWED_PATHS = ["/dashboard"];
const GUEST_BLOCKED_VIEWS = ["favorites", "history", "settings", "alerts"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always use getUser() — never getSession() for auth checks
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isApiRoute =
    pathname.startsWith("/api") && !pathname.startsWith("/api/auth");
  const isLoginRoute = pathname === "/login";

  // ── API routes always require auth ──────────────────────────────────────────
  if (isApiRoute && !user) {
    return new NextResponse(
      JSON.stringify({ success: false, error: "Non autorisé" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Dashboard: guest mode (?q= from landing) vs full auth ───────────────────
  if (isDashboard && !user) {
    const hasQuery = searchParams.has("q");

    // Guest trying to access protected views → redirect to login
    const view = searchParams.get("view") ?? "";
    if (!hasQuery || GUEST_BLOCKED_VIEWS.includes(view)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Guest with ?q — allow read-only dashboard (store-only, no Supabase writes)
    // Mark as guest so client can hide auth-only UI
    supabaseResponse.headers.set("x-linkscout-guest", "1");
  }

  // ── Already logged in → skip login page ─────────────────────────────────────
  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Security headers ─────────────────────────────────────────────────────────
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
