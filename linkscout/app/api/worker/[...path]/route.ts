import { NextRequest, NextResponse } from "next/server";

const DEFAULT_WORKER_URL = "https://linkscout-vfkm.onrender.com";
const SCRAPE_TIMEOUT_MS = 90_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function workerBaseUrl(): string {
  return (
    process.env.WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    DEFAULT_WORKER_URL
  ).replace(/\/$/, "");
}

function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  return headers;
}

async function proxyWorker(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const targetPath = pathSegments.join("/");
  const url = `${workerBaseUrl()}/${targetPath}${req.nextUrl.search}`;
  const timeoutMs =
    targetPath === "scrape" ? SCRAPE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.arrayBuffer()
        : undefined;

    const upstream = await fetch(url, {
      method: req.method,
      headers: forwardHeaders(req),
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await upstream.text();

    if (!text.trim()) {
      console.error(
        `[worker-proxy] Empty upstream response for ${targetPath} (HTTP ${upstream.status})`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Réponse vide du worker backend",
          jobs: [],
        },
        { status: 502 },
      );
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message =
      err instanceof Error ? err.message : "Erreur inconnue";
    console.error(`[worker-proxy] ${targetPath} failed:`, message);

    return NextResponse.json(
      {
        success: false,
        error: isAbort
          ? "Timeout du service de scraping — réessayez dans quelques secondes"
          : `Worker inaccessible: ${message}`,
        jobs: [],
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxyWorker(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
