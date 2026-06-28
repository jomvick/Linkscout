import { http, HttpResponse, delay } from "msw";

type MockJsonResponse = Parameters<typeof HttpResponse.json>[0];

// ---------------------------------------------------------------------------
// MSW Handlers — LinkScout Test Suite
// Intercepte Supabase REST, Groq API, Clearbit, et les endpoints internes
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://your-project.supabase.co";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CLEARBIT_AUTOCOMPLETE = "https://autocomplete.clearbit.com/v1/companies/suggest";
const CLEARBIT_LOGO = "https://logo.clearbit.com/*";

// --- Fixtures partagés ---

const MOCK_JOBS_DB = [
  {
    id: "sb-job-001",
    created_at: "2025-06-01T10:00:00Z",
    title: "Senior React Developer",
    company: "TechCorp",
    description: "React, TypeScript, Next.js position",
    url: "https://linkedin.com/jobs/view/1",
    logo_url: "https://logo.clearbit.com/techcorp.com",
    location: "Paris",
    source: "linkedin",
    status: "new",
    match_score: null,
    summary: null,
    tech_stack: null,
    salary: null,
    contract_type: null,
    score_breakdown: null,
    verdict_ai: null,
    pitch: null,
  },
];

// --- Handlers ---

export const handlers = [
  // ── Supabase REST: SELECT jobs ──────────────────────────────────────
  http.get(`${SUPABASE_URL}/rest/v1/jobs`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") ?? "";

    let filtered = [...MOCK_JOBS_DB];
    if (statusFilter) {
      filtered = filtered.filter((j) => j.status === statusFilter);
    }

    return HttpResponse.json(filtered, {
      headers: { "content-range": `0-${filtered.length - 1}/${filtered.length}` },
    });
  }),

  // ── Supabase REST: INSERT job ───────────────────────────────────────
  http.post(`${SUPABASE_URL}/rest/v1/jobs`, async ({ request }) => {
    await delay(30);
    const body = (await request.json()) as Record<string, unknown>;
    const newJob = {
      id: `sb-job-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...body,
    };
    MOCK_JOBS_DB.push(newJob as never);
    return HttpResponse.json(newJob, { status: 201 });
  }),

  // ── Supabase REST: PATCH job (status update) ────────────────────────
  http.patch(`${SUPABASE_URL}/rest/v1/jobs`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("id");
    const body = (await request.json()) as Record<string, unknown>;

    const idx = MOCK_JOBS_DB.findIndex((j) => j.id === id);
    if (idx !== -1) {
      MOCK_JOBS_DB[idx] = { ...MOCK_JOBS_DB[idx], ...body } as never;
    }

    return HttpResponse.json({}, { status: 200 });
  }),

  // ── Supabase Realtime (websocket) — pas mocké via MSW, voir note ci-dessous ──
  // Note: Realtime utilise WebSocket. Pour les tests React, simuler les events via
  // un EventEmitter ou utiliser le channel mock dans test_dashboard_context.

  // ── Groq API: Analyze Job ──────────────────────────────────────────
  http.post(GROQ_URL, async ({ request }) => {
    await delay(100);

    const body = (await request.json()) as { messages?: Array<{ role: string; content: string }> };
    const content = body?.messages?.find((m) => m.role === "user")?.content ?? "";

    // Simuler différents cas selon le contenu
    const hasResume = content.includes("CV du candidat");
    const hasKeyword = !hasResume || content.includes("mot-clé");

    let matchScore = 72;
    let scoreBreakdown: Record<string, unknown>;

    if (hasResume && !content.includes("mot-clé")) {
      // Cas résumé seulement
      matchScore = 88;
      scoreBreakdown = {
        keyword_alignment: null,
        skills_match: 88,
        seniority_match: 85,
      };
    } else if (!hasResume) {
      // Cas keyword seulement
      scoreBreakdown = {
        keyword_alignment: 72,
        skills_match: null,
        seniority_match: null,
      };
    } else {
      scoreBreakdown = {
        keyword_alignment: 72,
        skills_match: 88,
        seniority_match: 85,
      };
    }

    return HttpResponse.json({
      id: "chatcmpl-mock",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              summary: "Position React confirmée avec stack moderne.",
              tech_stack: ["React", "TypeScript", "Next.js"],
              match_score: matchScore,
              estimated_salary: "60-80K EUR",
              contract_type: "CDI",
              seniority: "Confirmé",
              remote_policy: "Hybride",
              score_breakdown: scoreBreakdown,
              verdict_ai: "Correspond bien au profil recherché.",
            }),
          },
          finish_reason: "stop",
        },
      ],
    });
  }),

  // ── Groq API: Rate Limit (429) ─────────────────────────────────────
  http.post(`${GROQ_URL}?simulate=429`, async () => {
    await delay(50);
    return new HttpResponse(
      JSON.stringify({ error: { message: "Rate limit exceeded", type: "rate_limit_error" } }),
      { status: 429, headers: { "Retry-After": "30" } }
    );
  }),

  // ── Groq API: Timeout (simulation via délai long) ──────────────────
  http.post(`${GROQ_URL}?simulate=timeout`, async () => {
    await delay(30_000); // Le test doit timeout avant
    return HttpResponse.json({});
  }),

  // ── Clearbit Autocomplete ──────────────────────────────────────────
  http.get(CLEARBIT_AUTOCOMPLETE, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";

    if (!query) {
      return HttpResponse.json([]);
    }

    return HttpResponse.json([
      { name: query, domain: `${query.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`, logo: `https://logo.clearbit.com/${query.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` },
    ]);
  }),

  // ── Clearbit Logo HEAD ─────────────────────────────────────────────
  http.head(CLEARBIT_LOGO, async () => {
    await delay(20);
    return new HttpResponse(null, { status: 200 });
  }),

  // ── Discord Webhook ────────────────────────────────────────────────
  http.post("https://discord.com/api/webhooks/*", async () => {
    await delay(50);
    return HttpResponse.json({}, { status: 204 });
  }),

  // ── Discord Webhook: Simuler 404 ───────────────────────────────────
  http.post("https://discord.com/api/webhooks/deleted/*", async () => {
    await delay(30);
    return new HttpResponse(null, { status: 404 });
  }),

  // ── Telegram Bot API ───────────────────────────────────────────────
  http.post("https://api.telegram.org/bot*/sendMessage", async () => {
    await delay(50);
    return HttpResponse.json({ ok: true, result: { message_id: 123 } });
  }),

  // ── Rust backend: /scrape ──────────────────────────────────────────
  http.post("http://localhost:8001/scrape", async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as { keyword?: string; limit?: number };
    return HttpResponse.json({
      success: true,
      keyword: body.keyword ?? "",
      jobs: MOCK_JOBS_DB.slice(0, body.limit ?? 10),
    });
  }),

  // ── Rust backend: /analyze ─────────────────────────────────────────
  http.post("http://localhost:8001/analyze", async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      analysis: {
        summary: "Bonne adéquation",
        match_score: 82,
        score_breakdown: { keyword_alignment: 82, skills_match: null, seniority_match: null },
      },
    });
  }),

];

// ---------------------------------------------------------------------------
// Handler builder pour tests spécifiques (override)
// ---------------------------------------------------------------------------
export const createMockHandler = (
  method: "get" | "post" | "patch" | "delete" | "head",
  url: string,
  response: MockJsonResponse,
  status = 200
) => {
  const matcher = url.includes("*") ? url : url;
  return http[method](matcher, async () => {
    await delay(10);
    return HttpResponse.json(response, { status });
  });
};
