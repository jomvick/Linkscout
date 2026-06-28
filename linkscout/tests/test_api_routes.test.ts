/**
 * test_api_routes.test.ts
 *
 * Tests unitaires pour les utilitaires côté client :
 *  - mapJob (lib/job-mapper)
 *  - isNaturalLanguage (lib/api-client)
 *  - apiIntent mock
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapJob } from "@/lib/job-mapper";
import { isNaturalLanguage } from "@/lib/api-client";

// ── mapJob ────────────────────────────────────────────────────────────────────

describe("mapJob — type guards", () => {
  it("maps a complete record correctly", () => {
    const raw = {
      id: "abc-123",
      title: "Senior React Developer",
      company: "Acme Corp",
      description: "Build React apps",
      url: "https://linkedin.com/job/1",
      source: "linkedin",
      status: "enriched",
      created_at: "2024-01-15T10:00:00Z",
      logo_url: "https://logo.clearbit.com/acme.com",
      match_score: 87,
      summary: "Great opportunity",
      tech_stack: ["React", "TypeScript"],
      salary: "70k-90k EUR",
      location: "Paris, France",
      contract_type: "CDI",
      pitch: "You should apply!",
      score_breakdown: {
        keyword_alignment: 90,
        skills_match: 85,
        seniority_match: 80,
      },
      verdict_ai: "Très bon match",
    };

    const job = mapJob(raw);

    expect(job.id).toBe("abc-123");
    expect(job.title).toBe("Senior React Developer");
    expect(job.status).toBe("enriched");
    expect(job.match_score).toBe(87);
    expect(job.tech_stack).toEqual(["React", "TypeScript"]);
    expect(job.score_breakdown?.keyword_alignment).toBe(90);
    expect(job.verdict_ai).toBe("Très bon match");
  });

  it("handles missing/null fields gracefully", () => {
    const raw = {
      id: "",
      title: "",
      company: "",
    };

    const job = mapJob(raw);

    expect(job.id).toBe("");
    expect(job.title).toBe("");
    expect(job.description).toBeNull();
    expect(job.url).toBeNull();
    expect(job.match_score).toBeNull();
    expect(job.tech_stack).toBeNull();
    expect(job.score_breakdown).toBeNull();
    expect(job.status).toBe("new"); // default
    expect(job.source).toBe("linkedin"); // default
  });

  it("rejects invalid status and defaults to 'new'", () => {
    const job = mapJob({ status: "pending" });
    expect(job.status).toBe("new");
  });

  it("accepts 'archived' status", () => {
    const job = mapJob({ status: "archived" });
    expect(job.status).toBe("archived");
  });

  it("uses estimated_salary as fallback when salary is missing", () => {
    const job = mapJob({ estimated_salary: "50k EUR" });
    expect(job.salary).toBe("50k EUR");
  });

  it("prefers salary over estimated_salary", () => {
    const job = mapJob({ salary: "70k EUR", estimated_salary: "50k EUR" });
    expect(job.salary).toBe("70k EUR");
  });

  it("filters empty strings from tech_stack", () => {
    const job = mapJob({ tech_stack: ["React", "", "TypeScript", "  "] });
    expect(job.tech_stack).toEqual(["React", "TypeScript"]);
  });

  it("returns null for empty tech_stack after filtering", () => {
    const job = mapJob({ tech_stack: ["", "  "] });
    expect(job.tech_stack).toBeNull();
  });

  it("handles non-array tech_stack", () => {
    const job = mapJob({ tech_stack: "React" });
    expect(job.tech_stack).toBeNull();
  });

  it("ignores non-finite match_score", () => {
    const job1 = mapJob({ match_score: NaN });
    const job2 = mapJob({ match_score: Infinity });
    const job3 = mapJob({ match_score: "87" });
    expect(job1.match_score).toBeNull();
    expect(job2.match_score).toBeNull();
    expect(job3.match_score).toBeNull();
  });
});

// ── isNaturalLanguage ─────────────────────────────────────────────────────────

describe("isNaturalLanguage", () => {
  it("returns true for long phrases", () => {
    expect(isNaturalLanguage("je cherche un job en développement web")).toBe(true);
    expect(isNaturalLanguage("looking for a senior react developer role")).toBe(true);
  });

  it("returns true for trigger words", () => {
    expect(isNaturalLanguage("je veux travailler")).toBe(true);
    expect(isNaturalLanguage("find me a job")).toBe(true);
    expect(isNaturalLanguage("cherche développeur")).toBe(true);
  });

  it("returns false for short direct keywords", () => {
    expect(isNaturalLanguage("React Developer")).toBe(false);
    expect(isNaturalLanguage("DevOps")).toBe(false);
    expect(isNaturalLanguage("Product Manager")).toBe(false);
  });

  it("handles empty string", () => {
    expect(isNaturalLanguage("")).toBe(false);
  });
});

// ── apiIntent (mocked fetch) ──────────────────────────────────────────────────

describe("apiIntent — fetch mock", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch").mockReset();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("returns parsed keywords from Groq response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          keywords: ["React Developer", "Frontend Engineer"],
          intent: "Cherche un poste de développeur React",
          fallback: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { apiIntent } = await import("@/lib/api-client");
    const result = await apiIntent("je cherche un job React");

    expect(result.keywords).toEqual(["React Developer", "Frontend Engineer"]);
    expect(result.fallback).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/intent",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handles network error gracefully", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { apiIntent } = await import("@/lib/api-client");

    await expect(apiIntent("test")).rejects.toThrow("Network error");
  });
});
