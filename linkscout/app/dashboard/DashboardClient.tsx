"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiAnalyze } from "@/lib/api-client";
import type { Job } from "@/lib/types";
import { updateJob, getJobs } from "@/lib/store";
import { useDashboard } from "@/context/DashboardContext";
import { useFirstUse } from "@/hooks/useFirstUse";
import Topbar from "@/components/Topbar";
import SearchView from "@/components/SearchView";
import FavoritesView from "@/components/FavoritesView";
import AlertsView from "@/components/AlertsView";
import HistoryView from "@/components/HistoryView";
import SettingsView from "@/components/SettingsView";
import CommandPalette from "@/components/CommandPalette";
import FilterChips from "@/components/FilterChips";
import FirstUseWizard from "@/components/FirstUseWizard";
import ErrorBoundary from "@/components/ErrorBoundary";

type View = "dashboard" | "favorites" | "alerts" | "history" | "settings";

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Recherche & Stats",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
  },
  {
    id: "favorites",
    label: "Favoris",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    ),
  },
  {
    id: "alerts",
    label: "Alertes",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    ),
  },
  {
    id: "history",
    label: "Historique",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const FILTERS = [
  { id: "Tous", label: "Tous" },
  { id: "Remote", label: "Remote" },
  { id: "Freelance", label: "Freelance" },
  { id: "CDI", label: "CDI" },
  { id: "Senior", label: "Senior" },
] as const;

export type FilterLabel = (typeof FILTERS)[number]["id"];

function matchesFilter(job: Job, filter: FilterLabel): boolean {
  if (filter === "Tous") return true;
  const loc = (job.location ?? "").toLowerCase();
  const title = (job.title ?? "").toLowerCase();
  const desc = (job.description ?? "").toLowerCase();
  const contract = (job.contract_type ?? "").toLowerCase();
  switch (filter) {
    case "Remote":
      return (
        loc.includes("remote") ||
        loc.includes("distanciel") ||
        contract.includes("remote")
      );
    case "Freelance":
      return (
        contract.includes("freelance") ||
        contract.includes("indep") ||
        contract.includes("contract") ||
        title.includes("freelance")
      );
    case "CDI":
      return (
        contract.includes("cdi") ||
        contract.includes("permanent") ||
        contract.includes("full-time")
      );
    case "Senior":
      return (
        title.includes("senior") ||
        title.includes("lead") ||
        title.includes("staff") ||
        title.includes("principal")
      );
    default:
      return true;
  }
}

export default function DashboardClient() {
  const {
    activeView: view,
    setActiveView: setView,
    jobs,
    selected,
    setSelected,
    favorites,
    toggleFavorite,
    isAuthed,
    resumeText,
    searching,
    analyzing,
    setAnalyzing,
    currentKeyword: query,
    searchJobs,
    refreshStats,
  } = useDashboard();

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [searchValue, setSearchValue] = useState(urlQuery || query);
  const [activeFilter, setActiveFilter] = useState<FilterLabel>("Tous");
  const [cmdOpen, setCmdOpen] = useState(false);
  const { showWizard, completeOnboarding, hasDoneFirstSearch, onFirstSearch } =
    useFirstUse();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (hasDoneFirstSearch && jobs.length === 0 && searchValue) {
      searchJobs(searchValue);
    }
  }, [hasDoneFirstSearch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAuthed) {
        router.push("/login");
        return;
      }
      onFirstSearch();
      searchJobs(searchValue);
    },
    [searchJobs, searchValue, isAuthed, router, onFirstSearch],
  );

  const handleAnalyze = useCallback(
    async (job: Job) => {
      if (!job.description || job.summary) return;
      if (!isAuthed) {
        router.push("/login");
        return;
      }
      setAnalyzing(true);
      try {
        const data = await apiAnalyze({
          jobId: job.id,
          job,
          keyword: query,
          resumeText,
        });
        if (data.success && data.analysis) {
          const a = data.analysis as Partial<Job>;
          updateJob(job.id, {
            summary: a.summary || null,
            tech_stack: a.tech_stack || null,
            match_score: a.match_score ?? null,
            score_breakdown: a.score_breakdown || null,
            verdict_ai: a.verdict_ai || null,
            salary: a.salary || null,
            contract_type: a.contract_type || null,
            location: a.location || null,
            status: a.status || "enriched",
          });
          refreshStats();
          setSelected(getJobs().find((j) => j.id === job.id) || selected);
        }
      } catch (err) {
        console.error("Analysis failed:", err);
      }
      setAnalyzing(false);
    },
    [query, resumeText, isAuthed, router, setAnalyzing],
  );

  const firstJobRef = useRef(false);
  useEffect(() => {
    if (
      hasDoneFirstSearch &&
      jobs.length > 0 &&
      !selected &&
      !firstJobRef.current
    ) {
      firstJobRef.current = true;
      const first = jobs[0];
      setSelected(first);
      if (!first.summary) handleAnalyze(first);
    }
  }, [hasDoneFirstSearch, jobs, handleAnalyze]);

  const handleSelect = useCallback(
    (job: Job) => {
      setSelected(job);
      if (!job.summary) handleAnalyze(job);
    },
    [handleAnalyze, setSelected],
  );

  const handleCommand = useCallback(
    (actionId: string) => {
      if (actionId === "favorites") setView("favorites");
      else if (actionId === "alerts") setView("alerts");
      else if (actionId === "history") setView("history");
      else if (actionId === "settings" || actionId === "cv")
        setView("settings");
      else setView("dashboard");
    },
    [setView],
  );

  const filteredJobs = jobs.filter((j) => matchesFilter(j, activeFilter));

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return (
          <div className="flex flex-col flex-1 overflow-hidden" key="dashboard">
            <div className="shrink-0 px-4 py-2.5 border-b border-border/40 bg-surface/50">
              <FilterChips
                chips={FILTERS.map((f) => ({ id: f.id, label: f.label }))}
                active={activeFilter}
                onChange={(id) => setActiveFilter(id as FilterLabel)}
              />
            </div>
            <SearchView
              jobs={filteredJobs}
              selected={selected}
              onSelect={handleSelect}
              onCloseDetail={() => setSelected(null)}
              analyzing={analyzing}
              onAnalyze={handleAnalyze}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              keyword={query}
              onSuggestionSearch={(kw) => {
                setSearchValue(kw);
                onFirstSearch();
                searchJobs(kw);
              }}
            />
          </div>
        );
      case "favorites":
        return <FavoritesView key="favorites" />;
      case "alerts":
        return <AlertsView key="alerts" />;
      case "history":
        return (
          <HistoryView
            key="history"
            onOpenSearch={(keyword) => {
              setView("dashboard");
              setSearchValue(keyword);
              searchJobs(keyword);
            }}
          />
        );
      case "settings":
        return <SettingsView key="settings" />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-canvas relative overflow-hidden">
        <nav className="flex h-full w-55 shrink-0 flex-col border-r border-border bg-surface select-none">
          <div className="flex items-center h-14 px-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand shadow-sm shadow-brand/20">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.58 5.58 0 006.25 10.5a5.58 5.58 0 012.038-3.712"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-text-primary">
                Link<span className="text-brand">Scout</span>
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-0.5 px-2 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? "text-brand"
                      : "text-text-secondary/60 hover:bg-canvas/60 hover:text-text-primary"
                  }`}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute inset-0 bg-brand/10 rounded-lg -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border px-2 py-3">
            <button
              type="button"
              onClick={() => setView("settings")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 relative ${
                view === "settings"
                  ? "text-brand"
                  : "text-text-secondary/60 hover:bg-canvas/60 hover:text-text-primary"
              }`}
              aria-pressed={view === "settings"}
            >
              {view === "settings" && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute inset-0 bg-brand/10 rounded-lg -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Paramètres</span>
            </button>
          </div>
        </nav>

        <div className="flex flex-1 flex-col min-w-0">
          <Topbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSubmit={handleSubmit}
            searching={searching}
            resultCount={filteredJobs.length}
            onCmdK={() => setCmdOpen(true)}
            onNavigate={setView}
          />

          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="h-full w-full flex flex-col"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <CommandPalette
          open={cmdOpen}
          onClose={() => setCmdOpen(false)}
          onAction={handleCommand}
          onSearch={(q) => {
            setSearchValue(q);
            searchJobs(q);
          }}
        />

        {showWizard && (
          <FirstUseWizard
            onComplete={() => {
              onFirstSearch();
              if (isAuthed && !searchValue) {
                setSearchValue("Développeur React");
                searchJobs("Développeur React");
              }
            }}
            onSkip={onFirstSearch}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
