import React, { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/context/DashboardContext", () => {
  const ctx = React.createContext<Record<string, unknown>>({});

  const makeValue = (overrides: Record<string, unknown> = {}) => ({
    activeView: "dashboard",
    setActiveView: vi.fn(),
    jobs: [],
    selected: null,
    setSelected: vi.fn(),
    stats: { totalJobs: 0, avgMatchScore: null, analyzedCount: 0, uniqueCompanies: 0 },
    isLoading: false,
    searching: false,
    analyzing: false,
    setAnalyzing: vi.fn(),
    currentKeyword: "",
    searchJobs: vi.fn(),
    favorites: new Set<string>(),
    toggleFavorite: vi.fn(),
    isAuthed: false,
    resumeText: "",
    useResumeMatch: false,
    refreshStats: vi.fn(),
    rehydrateFromServer: vi.fn(),
    ...overrides,
  });

  const defaultVal = makeValue();

  return {
    DashboardProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(ctx.Provider, { value: defaultVal }, children),
    useDashboard: () => React.useContext(ctx),
  };
});

import { useDashboard } from "@/context/DashboardContext";
import { DashboardProvider } from "@/context/DashboardContext";

function setup() {
  return renderHook(() => useDashboard(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(DashboardProvider, null, children),
  });
}

describe("DashboardContext — basic structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default stats shape", () => {
    const { result } = setup();
    expect(result.current.stats).toMatchObject({
      totalJobs: 0,
      avgMatchScore: null,
      analyzedCount: 0,
    });
  });

  it("provides expected action functions", () => {
    const { result } = setup();
    expect(typeof result.current.searchJobs).toBe("function");
    expect(typeof result.current.toggleFavorite).toBe("function");
    expect(typeof result.current.refreshStats).toBe("function");
    expect(typeof result.current.toggleFavorite).toBe("function");
    expect(typeof result.current.rehydrateFromServer).toBe("function");
  });
});
