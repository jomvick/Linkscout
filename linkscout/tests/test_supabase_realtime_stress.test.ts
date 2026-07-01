import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  addJobs,
  getJobs,
  getStats,
  updateJob,
  type JobDraft,
} from "@/lib/store";

function uniqueUrl(i: number) {
  return `https://linkedin.com/jobs/${i}`;
}

/** Factory with all required nullable fields — mirrors real Realtime payloads. */
function makeJob(overrides: Partial<JobDraft> & { id: string }): JobDraft {
  return {
    title: "Default Job",
    company: "DefaultCorp",
    url: uniqueUrl(0),
    source: "linkedin",
    status: "new",
    description: null,
    logo_url: null,
    match_score: null,
    summary: null,
    tech_stack: null,
    salary: null,
    location: null,
    contract_type: null,
    remote_policy: null,
    seniority: null,
    pitch: null,
    score_breakdown: null,
    verdict_ai: null,
    score_coherence_generale: null,
    score_coherence_cv: null,
    ...overrides,
  };
}

describe("Supabase Realtime — stress test 10 concurrent inserts", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__linkscout_store;
  });

  it("10 inserts simultanés avec IDs uniques ne produisent pas de doublons", () => {
    const jobs = Array.from({ length: 10 }, (_, i) =>
      makeJob({
        id: `realtime-${i}`,
        title: `Job ${i}`,
        company: `Company ${i % 3}`,
        url: uniqueUrl(i),
        match_score: Math.floor(Math.random() * 100),
      }),
    );

    addJobs(jobs);
    const stored = getJobs();

    expect(stored).toHaveLength(10);
    expect(new Set(stored.map((j) => j.id)).size).toBe(10);
  });

  it("10 inserts avec IDs identiques produisent exactement 1 job (upsert)", () => {
    const batch = Array.from({ length: 10 }, (_, i) =>
      makeJob({
        id: "same-id",
        title: `Update ${i}`,
        company: "SameCorp",
        url: "https://ex.com/same",
      }),
    );

    addJobs(batch);
    const stored = getJobs();

    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Update 9");
    // Only 1 was truly new; 9 merged without incrementing totalScraped
    expect(getStats().totalScraped).toBe(1);
  });

  it("10 inserts avec URLs identiques mais IDs différents fusionnent", () => {
    const batch = Array.from({ length: 10 }, (_, i) =>
      makeJob({
        id: `diff-id-${i}`,
        title: "Job",
        company: "Corp",
        url: "https://ex.com/unique-job",
      }),
    );

    addJobs(batch);
    const stored = getJobs();

    // URL dedup: 1 new, 9 merges
    expect(stored).toHaveLength(1);
    expect(getStats().totalScraped).toBe(1);
  });

  it("2 vagues de 5 inserts avec 2 doublons entre elles", () => {
    const wave1 = Array.from({ length: 5 }, (_, i) =>
      makeJob({
        id: `w1-${i}`,
        title: `Wave1 Job ${i}`,
        company: `Corp ${i}`,
        url: uniqueUrl(i),
      }),
    );

    const wave2 = [
      ...wave1.slice(0, 2).map((j) => ({
        ...j,
        title: `${j.title} Updated`,
        match_score: 99,
      })),
      ...Array.from({ length: 3 }, (_, i) =>
        makeJob({
          id: `w2-${i}`,
          title: `Wave2 Job ${i}`,
          company: `NewCorp ${i}`,
          url: uniqueUrl(10 + i),
        }),
      ),
    ];

    addJobs(wave1);
    addJobs(wave2);
    const stored = getJobs();

    // 5 + 3 nouveaux (2 doublons mergés) = 8
    expect(stored).toHaveLength(8);
    expect(stored.filter((j) => j.match_score === 99)).toHaveLength(2);
    expect(getStats().totalScraped).toBe(8);
  });

  it("ne panique pas avec des données partielles (champs manquants)", () => {
    // Test that addJobs is lenient with partial data via Realtime
    const partialJobs: JobDraft[] = [
      {
        ...makeJob({ id: "p1", title: "Partial 1", company: "Corp" }),
        url: null,
      },
      makeJob({
        id: "p2",
        title: "Partial 2",
        company: "Corp",
        url: "https://ex.com/p2",
      }),
      {
        ...makeJob({ id: "p3", title: "Partial 3" }),
        company: undefined as unknown as string,
        url: null,
      },
    ];

    addJobs(partialJobs);
    const stored = getJobs();

    expect(stored).toHaveLength(3);
    // p3 was prepended first → index 0
    expect(stored[0].company).toBeUndefined();
  });
});

describe("Status mutation — StatsOverview recalcul instantané", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__linkscout_store;
  });

  it("updateJob modifie le status et getStats reste cohérent", () => {
    addJobs([
      makeJob({
        id: "j1",
        title: "Job A",
        company: "Corp A",
        url: "https://ex.com/a",
      }),
      makeJob({
        id: "j2",
        title: "Job B",
        company: "Corp B",
        url: "https://ex.com/b",
      }),
    ]);

    updateJob("j1", { status: "archived" });

    expect(getJobs().find((j) => j.id === "j1")?.status).toBe("archived");
    expect(getStats().totalScraped).toBe(2);
  });
});
