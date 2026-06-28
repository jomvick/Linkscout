import { describe, it, expect, beforeEach } from "vitest";
import {
  addJobs,
  getJobs,
  getStats,
  updateJob,
  type JobDraft,
} from "@/lib/store";

const makeJob = (overrides: Partial<JobDraft> = {}): JobDraft => ({
  title: "Test Job",
  company: "TestCorp",
  description: "A test position",
  url: "https://example.com/job/1",
  source: "linkedin",
  status: "new",
  match_score: null,
  logo_url: null,
  summary: null,
  tech_stack: null,
  salary: null,
  location: null,
  contract_type: null,
  pitch: null,
  score_breakdown: null,
  verdict_ai: null,
  ...overrides,
});

const uniqueUrl = (i: number) => `https://example.com/job/${i + 100}`;

describe("addJobs — deduplication", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__linkscout_store;
  });

  it("adds a new job and increments totalScraped", () => {
    const [job] = addJobs([makeJob({ id: "1", url: uniqueUrl(1) })]);
    expect(job.id).toBe("1");
    expect(getJobs()).toHaveLength(1);
    expect(getStats().totalScraped).toBe(1);
  });

  it("deduplicates by id — merge doesn't increment totalScraped", () => {
    addJobs([makeJob({ id: "1", title: "Original", url: uniqueUrl(1) })]);
    addJobs([makeJob({ id: "1", title: "Updated", url: uniqueUrl(1) })]);
    expect(getJobs()).toHaveLength(1);
    expect(getJobs()[0].title).toBe("Updated");
    expect(getStats().totalScraped).toBe(1);
  });

  it("deduplicates by url when id is missing", () => {
    addJobs([makeJob({ url: uniqueUrl(1) })]);
    addJobs([makeJob({ url: uniqueUrl(1), match_score: 90 })]);
    expect(getJobs()).toHaveLength(1);
    expect(getJobs()[0].match_score).toBe(90);
    expect(getStats().totalScraped).toBe(1);
  });

  it("deduplicates by title+company when both id and url are missing", () => {
    addJobs([
      makeJob({ id: undefined, url: undefined, title: "Dev", company: "Co" }),
    ]);
    addJobs([
      makeJob({
        id: undefined,
        url: undefined,
        title: "Dev",
        company: "Co",
        source: "linkedin_guest",
      }),
    ]);
    expect(getJobs()).toHaveLength(1);
    expect(getStats().totalScraped).toBe(1);
  });

  it("prepends new jobs to the beginning", () => {
    addJobs([makeJob({ id: "1", title: "First", url: uniqueUrl(1) })]);
    addJobs([makeJob({ id: "2", title: "Second", url: uniqueUrl(2) })]);
    expect(getJobs()[0].title).toBe("Second");
  });
});

describe("addJobs — concurrency stress (no real duplicates)", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__linkscout_store;
  });

  it("handles 10 simultaneous inserts with unique ids", () => {
    const batch = Array.from({ length: 10 }, (_, i) =>
      makeJob({ id: `batch-${i}`, title: `Job ${i}`, url: uniqueUrl(i) }),
    );
    const result = addJobs(batch);
    expect(result).toHaveLength(10);
    expect(getJobs()).toHaveLength(10);
    expect(getStats().totalScraped).toBe(10);

    const uniqueIds = new Set(getJobs().map((j) => j.id));
    expect(uniqueIds.size).toBe(10);
  });

  it("handles two overlapping batches without duplicating", () => {
    const batch1 = Array.from({ length: 5 }, (_, i) =>
      makeJob({ id: `id-${i}`, title: `Job ${i}`, url: uniqueUrl(i) }),
    );
    const batch2 = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeJob({
          id: `id-${i}`,
          title: `Job ${i} Updated`,
          url: uniqueUrl(i),
        }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        makeJob({ id: `new-${i}`, title: `New ${i}`, url: uniqueUrl(10 + i) }),
      ),
    ];
    addJobs(batch1);
    addJobs(batch2);
    expect(getJobs()).toHaveLength(7);
    expect(getJobs().filter((j) => j.title.includes("Updated"))).toHaveLength(
      3,
    );
    expect(getStats().totalScraped).toBe(7);
  });
});

describe("updateJob", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__linkscout_store;
  });

  it("updates existing job fields", () => {
    addJobs([
      makeJob({ id: "1", url: uniqueUrl(1), match_score: null, status: "new" }),
    ]);
    const updated = updateJob("1", { match_score: 85, status: "enriched" });
    expect(updated?.match_score).toBe(85);
    expect(updated?.status).toBe("enriched");
  });

  it("returns null for unknown id", () => {
    const result = updateJob("nonexistent", { status: "enriched" });
    expect(result).toBeNull();
  });
});

describe("getStats", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__linkscout_store;
  });

  it("counts unique companies and total scraped", () => {
    addJobs([
      makeJob({
        id: "1",
        title: "Engineer",
        company: "Google",
        url: "https://ex.com/1",
      }),
      makeJob({
        id: "2",
        title: "Manager",
        company: "Google",
        url: "https://ex.com/2",
      }),
      makeJob({
        id: "3",
        title: "Dev",
        company: "Meta",
        url: "https://ex.com/3",
      }),
    ]);
    const stats = getStats();
    expect(stats.totalScraped).toBe(3);
    expect(stats.uniqueCompanies).toBe(2);
  });

  it("handles empty store", () => {
    const stats = getStats();
    expect(stats.totalScraped).toBe(0);
    expect(stats.uniqueCompanies).toBe(0);
  });
});
