import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const locales = ["en", "fr"];
const defaultLocale = "en";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

const SKIP_LOCALE = ["/api/", "/auth/", "/_next/", "/favicon"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Rewrite / → /en so [locale] segment is matched ──────────────
  if (pathname === "/") {
    request.nextUrl.pathname = "/en";
    const rewrite = NextResponse.rewrite(request.nextUrl);
    addSecurityHeaders(rewrite);
    return rewrite;
  }

  // ── 2. Skip locale for non-page routes ──────────────────────────────
  if (SKIP_LOCALE.some((p) => pathname.startsWith(p))) {
    return handleAuth(request);
  }

  // ── 3. Auth guard (check before intl for redirect decisions) ────────
  const locale = pathname.match(/^\/(en|fr)/)?.[1] || defaultLocale;
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)(\/|$)/, "/$2");
  const isDashboard = pathWithoutLocale.startsWith("/dashboard");
  const isLogin = pathWithoutLocale === "/login";

  const authRedirect = await checkAuth(request, locale, pathname, isDashboard, isLogin);
  if (authRedirect) return authRedirect;

  // ── 4. Let next-intl handle locale routing ──────────────────────────
  const intlResponse = intlMiddleware(request);
  addSecurityHeaders(intlResponse);
  return intlResponse;
}

async function checkAuth(
  request: NextRequest,
  locale: string,
  originalPathname: string,
  isDashboard: boolean,
  isLogin: boolean,
): Promise<NextResponse | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("callbackUrl", originalPathname);
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const cb = request.nextUrl.searchParams.get("callbackUrl");
    const url = request.nextUrl.clone();
    url.pathname = cb || `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return null;
}

async function handleAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api") && !pathname.startsWith("/api/auth");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (isApiRoute && !user) {
    return NextResponse.json(
      { success: false, error: "Non autorisé" },
      { status: 401 },
    );
  }

  const redirect = await checkAuth(request, "en", pathname, false, false);
  if (redirect) return redirect;

  const response = NextResponse.next({ request });
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
