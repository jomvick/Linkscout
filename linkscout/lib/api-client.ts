import { createClient } from "@/lib/supabase/client";

const WORKER = "/api/worker";

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export interface ScrapeResult {
  success: boolean;
  keyword: string;
  jobs: Record<string, unknown>[];
  error?: string;
  guest?: boolean;
  persisted?: boolean;
}

/** Trigger a LinkedIn scrape for the given keyword via the Rust worker. */
export async function apiScrape(
  keyword: string,
  limit = 20,
): Promise<ScrapeResult> {
  const headers = await authHeaders();
  const res = await fetch(`${WORKER}/scrape`, {
    method: "POST",
    headers,
    body: JSON.stringify({ keyword, limit }),
  });
  return res.json();
}

// ── Natural language intent → LinkedIn search keywords ────────────────────────

export interface IntentResult {
  keywords: string[];
  intent: string;
  fallback?: boolean;
  error?: string;
}

/** Convert natural-language intent into LinkedIn-ready search keywords via Groq. */
export async function apiIntent(text: string): Promise<IntentResult> {
  const res = await fetch("/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.json();
}

// ── Fetch top scraping keywords from the user's stored CV ────────────────────

export interface ResumeKeywordsResult {
  keywords: string[];   // top 3 LinkedIn-ready search terms
  summary?: string;
  hasResume: boolean;
}

/** Fetch top 3 scraping keywords derived from the user's stored CV. */
export async function apiResumeKeywords(): Promise<ResumeKeywordsResult> {
  const res = await fetch("/api/resume", { method: "GET" });
  const data = await res.json();

  if (!data.success || !data.resume) {
    return { keywords: [], hasResume: false };
  }

  const resume = data.resume;

  // Prefer LinkedIn-ready search_keywords (set by the Groq worker after CV analysis).
  // Fall back to raw extracted_skills with basic transformation.
  const searchKw: string[] = Array.isArray(resume.search_keywords)
    ? resume.search_keywords.filter((s: unknown) => typeof s === "string").slice(0, 3)
    : [];

  if (searchKw.length > 0) {
    return { keywords: searchKw, summary: resume.summary, hasResume: true };
  }

  const skills: string[] = Array.isArray(resume.extracted_skills)
    ? resume.extracted_skills.filter((s: unknown) => typeof s === "string")
    : [];

  if (skills.length === 0) {
    return { keywords: [], summary: resume.summary, hasResume: true };
  }

  // Fallback: take top 3 skills and shape them as job title keywords
  const keywords = skills.slice(0, 3).map((skill) => {
    if (/\s|engineer|developer|dev|lead|architect|manager|designer/i.test(skill)) {
      return skill;
    }
    return `${skill} Developer`;
  });

  return { keywords, summary: resume.summary, hasResume: true };
}

// ── Detect whether user input is natural language or a direct keyword ─────────
// Simple heuristic: >3 words OR starts with interrogative/verb → treat as NL phrase.
const NL_TRIGGERS = /^(je|j'|i |i'm|looking|find|cherche|trouver|besoin|want|need|show)/i;

/** Heuristic: >3 words or starts with an interrogative/verb → treat as natural language. */
export function isNaturalLanguage(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length > 3 || NL_TRIGGERS.test(text.trim());
}

// ── Analyze ───────────────────────────────────────────────────────────────────

export interface AnalyzeResult {
  success: boolean;
  analysis?: Record<string, unknown>;
  answer?: string;
  error?: string;
}

type AnalyzeJobInput = {
  title?: unknown;
  company?: unknown;
  description?: unknown;
};

/** Analyze a job posting via the Rust worker (summary, tech stack, match score, pitch). */
export async function apiAnalyze(params: {
  jobId?: string;
  job?: AnalyzeJobInput;
  keyword?: string;
  question?: string;
  resumeText?: string;
}): Promise<AnalyzeResult> {
  const { jobId, job, keyword, question, resumeText } = params;
  const headers = await authHeaders();

  const jobTitle = str(job?.title);
  const jobCompany = str(job?.company);
  const jobDescription = str(job?.description);

  const body: Record<string, unknown> = {
    title: jobTitle,
    company: jobCompany,
    description: jobDescription,
  };
  if (jobId) body.job_id = jobId;
  if (keyword) body.keyword = keyword;
  if (question) body.question = question;
  if (resumeText) body.resume_text = resumeText;

  const res = await fetch(`${WORKER}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

