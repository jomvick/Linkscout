import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:8001";

export async function GET(_: NextRequest) {
  const backendUrl = process.env.PING_BACKEND_URL || process.env.NEXT_PUBLIC_WORKER_URL || DEFAULT_BACKEND_URL;
  const healthUrl = new URL("/health", backendUrl).toString();

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (response.ok) {
      return NextResponse.json({ ok: true, status: response.status, url: healthUrl });
    }

    return NextResponse.json(
      { ok: false, status: response.status, url: healthUrl },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        url: healthUrl,
      },
      { status: 502 },
    );
  }
}
