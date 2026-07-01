"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiScrape } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { mapJob } from "@/lib/job-mapper";
import { GuestSession } from "@/lib/guest-session";

import { getJobs, addJobs, type JobDraft } from "@/lib/store";
import { cacheStore } from "@/lib/cache/cacheStore";
import type { Job, SearchHistory, CollectionWithJob } from "@/lib/types";

export type ActiveView =
  | "dashboard"
  | "favorites"
  | "alerts"
  | "history"
  | "settings";

export interface Stats {
  totalJobs: number;
  avgMatchScore: number | null;
  analyzedCount: number;
  uniqueCompanies: number;
}

interface DashboardContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  jobs: Job[];
  selected: Job | null;
  setSelected: (job: Job | null) => void;
  stats: Stats;
  isLoading: boolean;
  searching: boolean;
  analyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  currentKeyword: string;
  searchJobs: (keyword: string, forceRefresh?: boolean) => Promise<void>;
  favorites: Set<string>;
  toggleFavorite: (jobId: string) => Promise<void>;
  isAuthed: boolean;
  isGuest: boolean;
  resumeText: string;
  useResumeMatch: boolean;
  refreshStats: () => void;
  rehydrateFromServer: (keyword: string) => Promise<void>;
  history: SearchHistory[];
  collectionItems: CollectionWithJob[];
  fetchUserHistory: () => Promise<void>;
  fetchUserCollection: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  userId: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("linkscout_favorites");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("linkscout_favorites", JSON.stringify([...favs]));
}

function computeStats(jobs: Job[]): Stats {
  const uniqueCompanies = new Set(jobs.map((j) => j.company).filter(Boolean))
    .size;
  const scoredJobs = jobs.filter((j) => j.match_score != null);
  const avgMatchScore =
    scoredJobs.length > 0
      ? Math.round(
          scoredJobs.reduce((acc, j) => acc + (j.match_score || 0), 0) /
            scoredJobs.length,
        )
      : null;
  return {
    totalJobs: jobs.length,
    avgMatchScore,
    analyzedCount: jobs.filter((j) => j.summary != null).length,
    uniqueCompanies,
  };
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState(query);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isAuthed, setIsAuthed] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [useResumeMatch, setUseResumeMatch] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [collectionItems, setCollectionItems] = useState<CollectionWithJob[]>(
    [],
  );

  const stats = useMemo(() => computeStats(jobs), [jobs]);

  useEffect(() => {
    setFavorites(loadFavorites());

    const current = getJobs();
    if (current.length > 0) {
      setJobs(current);
      return;
    }
    // Restore guest session on hard refresh
    const session = GuestSession.load();
    if (session) {
      setJobs(session.jobs);
      setIsGuest(true);
      setCurrentKeyword(session.keyword);
    }
  }, []);

  const loadSupabaseData = useCallback(
    async (supabase: ReturnType<typeof createClient>, uid: string) => {
      const [favResult, histResult, collResult] = await Promise.allSettled([
        supabase
          .from("collections")
          .select("job_id")
          .eq("user_id", uid)
          .eq("status", "bookmarked"),
        supabase
          .from("search_history")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("collections")
          .select("*, job:job_id(*)")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
      ]);

      if (favResult.status === "fulfilled" && favResult.value.data?.length) {
        const favIds = new Set(favResult.value.data.map((r) => r.job_id));
        setFavorites(favIds);
        saveFavorites(favIds);
      }

      if (histResult.status === "fulfilled" && histResult.value.data) {
        setHistory(histResult.value.data as SearchHistory[]);
      }

      if (collResult.status === "fulfilled" && collResult.value.data) {
        setCollectionItems(
          collResult.value.data as unknown as CollectionWithJob[],
        );
      }
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthed(true);
        setUserId(session.user.id);
        loadSupabaseData(supabase, session.user.id);

        fetch("/api/resume")
          .then((r) => r.json())
          .then((data) => {
            if (
              data.success &&
              data.resume &&
              data.settings?.use_resume_match
            ) {
              setResumeText(data.resume.raw_text);
              setUseResumeMatch(true);
            }
          })
          .catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setIsAuthed(true);
        setIsGuest(false);
        setUserId(session.user.id);
        GuestSession.clear();
        setCurrentKeyword("");
        loadSupabaseData(supabase, session.user.id).then(() => {
          fetch("/api/resume")
            .then((r) => r.json())
            .then((data) => {
              if (
                data.success &&
                data.resume &&
                data.settings?.use_resume_match
              ) {
                setResumeText(data.resume.raw_text);
                setUseResumeMatch(true);
              }
            })
            .catch(() => {});
        });
      } else if (event === "SIGNED_OUT") {
        setIsAuthed(false);
        setIsGuest(false);
        setUserId(null);
        setFavorites(loadFavorites());
        setHistory([]);
        setCollectionItems([]);
        setResumeText("");
        setUseResumeMatch(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSupabaseData]);

  // Realtime subscribe to resume changes for this user
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("resumes-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "resumes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.status === "done" && row.raw_text) {
            setResumeText(row.raw_text as string);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "favorites") setActiveView("favorites");
      else if (detail === "alerts") setActiveView("alerts");
      else if (detail === "history") setActiveView("history");
      else if (detail === "settings") setActiveView("settings");
      else setActiveView("dashboard");
    };
    window.addEventListener("linkscout-navigate", handler);
    return () => window.removeEventListener("linkscout-navigate", handler);
  }, []);

  const refreshStats = useCallback(() => {
    setJobs([...getJobs()]);
  }, []);

  const rehydrateFromServer = useCallback(async (keyword: string) => {
    const cacheKey = keyword ? `jobs_${keyword}` : null;

    if (cacheKey) {
      const cached = cacheStore.getSession<Job[]>(cacheKey);
      if (cached) {
        addJobs(cached);
        setJobs(getJobs());
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/jobs${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""}`,
      );
      if (res.ok) {
        const body = await res.json();
        const jobs = Array.isArray(body) ? body : body.jobs;
        if (Array.isArray(jobs) && jobs.length > 0) {
          addJobs(jobs as JobDraft[]);
          setJobs(getJobs());
          if (cacheKey && !body.degraded) cacheStore.setSession(cacheKey, getJobs(), 15);
        }
      }
    } catch (err) {
      console.error("Rehydration failed:", err);
    }
    setIsLoading(false);
  }, []);

  const saveToHistory = useCallback(
    async (keyword: string, resultsCount: number) => {
      if (!isAuthed || !userId) return;
      try {
        const supabase = createClient();
        await supabase.from("search_history").insert({
          user_id: userId,
          keyword,
          results_count: resultsCount,
        });
        // Optimistically prepend to local state
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            user_id: userId,
            keyword,
            results_count: resultsCount,
            created_at: new Date().toISOString(),
          } as SearchHistory,
          ...prev.slice(0, 49),
        ]);
      } catch {
        // Non-blocking: history is a nice-to-have
      }
    },
    [isAuthed, userId],
  );

  const searchJobs = useCallback(
    async (keyword: string, forceRefresh = false) => {
      const trimmed = keyword.trim();
      if (!trimmed || searching) return;

      const cacheKey = `jobs_${trimmed}`;

      if (!forceRefresh) {
        const cached = cacheStore.getSession<Job[]>(cacheKey);
        if (cached) {
          addJobs(cached);
          setJobs(getJobs());
          setActiveView("dashboard");
          setCurrentKeyword(trimmed);
          router.push(`/dashboard?q=${encodeURIComponent(trimmed)}`, {
            scroll: false,
          });
          return;
        }
      }

      setSearching(true);
      setIsGuest(false);
      setActiveView("dashboard");
      setCurrentKeyword(trimmed);
      try {
        const data = await apiScrape(trimmed);
        if (data.success && data.jobs?.length > 0) {
          const mapped = data.jobs.map(
            (j: Record<string, unknown>) => mapJob(j)
          );
          const isGuestUser = data.guest === true;
          setIsGuest(isGuestUser);
          addJobs(mapped);
          setJobs(getJobs());
          if (isGuestUser) {
            GuestSession.save(trimmed, getJobs());
          } else {
            cacheStore.setSession(cacheKey, getJobs(), 15);
            saveToHistory(trimmed, mapped.length);
          }
        }
        router.push(`/dashboard?q=${encodeURIComponent(trimmed)}`, {
          scroll: false,
        });
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    },
    [searching, router, saveToHistory],
  );

  const toggleFavorite = useCallback(
    async (jobId: string) => {
      const isFav = favorites.has(jobId);
      const previousFavs = new Set(favorites);
      const previousJobs = [...jobs];
      const updatedFavs = new Set(favorites);

      if (updatedFavs.has(jobId)) updatedFavs.delete(jobId);
      else updatedFavs.add(jobId);

      setFavorites(updatedFavs);
      saveFavorites(updatedFavs);

      if (!isAuthed) return;

      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, action: isFav ? "remove" : "add" }),
        });
        if (!res.ok) throw new Error("Échec de la synchronisation serveur");

        if (currentKeyword) {
          cacheStore.removeSession(`jobs_${currentKeyword}`);
        }
      } catch {
        setFavorites(previousFavs);
        saveFavorites(previousFavs);
        if (currentKeyword) {
          cacheStore.setSession(`jobs_${currentKeyword}`, previousJobs, 15);
        }
      }
    },
    [favorites, isAuthed, currentKeyword, jobs],
  );

  const fetchUserHistory = useCallback(async () => {
    if (!isAuthed) return;
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        if (data.history) setHistory(data.history as SearchHistory[]);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, [isAuthed]);

  const fetchUserCollection = useCallback(async () => {
    if (!isAuthed || !userId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("collections")
        .select("*, job:job_id(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setCollectionItems(data as unknown as CollectionWithJob[]);
      }
    } catch (err) {
      console.error("Failed to fetch collection:", err);
    }
  }, [isAuthed, userId]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((h) => h.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, []);

  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const job: JobDraft = {
            id: typeof row.id === "string" ? row.id : undefined,
            created_at:
              typeof row.created_at === "string" ? row.created_at : undefined,
            title: (row.title as string) || "",
            company: (row.company as string) || "",
            description: (row.description as string) || null,
            url: (row.url as string) || null,
            logo_url: (row.logo_url as string) || null,
            location: (row.location as string) || null,
            source: (row.source as string) || "linkedin",
            status:
              row.status === "enriched" || row.status === "archived"
                ? row.status
                : "new",
            match_score:
              typeof row.match_score === "number" ? row.match_score : null,
            score_breakdown: row.score_breakdown
              ? (row.score_breakdown as Job["score_breakdown"])
              : null,
            verdict_ai: (row.verdict_ai as string) || null,
            summary: (row.summary as string) || null,
            tech_stack: Array.isArray(row.tech_stack)
              ? (row.tech_stack as string[])
              : null,
            salary: (row.salary as string) || null,
            contract_type: (row.contract_type as string) || null,
            remote_policy: (row.remote_policy as string) || null,
            seniority: (row.seniority as string) || null,
            pitch: (row.pitch as string) || null,
            score_coherence_generale:
              typeof row.score_coherence_generale === "number"
                ? row.score_coherence_generale
                : null,
            score_coherence_cv:
              typeof row.score_coherence_cv === "number"
                ? row.score_coherence_cv
                : null,
          };
          addJobs([job]);
          setJobs(getJobs());
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const id = typeof row.id === "string" ? row.id : null;
          if (!id) return;
          const job: JobDraft = {
            id,
            created_at:
              typeof row.created_at === "string" ? row.created_at : undefined,
            title: (row.title as string) || "",
            company: (row.company as string) || "",
            description: (row.description as string) || null,
            url: (row.url as string) || null,
            logo_url: (row.logo_url as string) || null,
            location: (row.location as string) || null,
            source: (row.source as string) || "linkedin",
            status:
              row.status === "enriched" || row.status === "archived"
                ? row.status
                : "new",
            match_score:
              typeof row.match_score === "number" ? row.match_score : null,
            score_breakdown: row.score_breakdown
              ? (row.score_breakdown as Job["score_breakdown"])
              : null,
            verdict_ai: (row.verdict_ai as string) || null,
            summary: (row.summary as string) || null,
            tech_stack: Array.isArray(row.tech_stack)
              ? (row.tech_stack as string[])
              : null,
            salary: (row.salary as string) || null,
            contract_type: (row.contract_type as string) || null,
            remote_policy: (row.remote_policy as string) || null,
            seniority: (row.seniority as string) || null,
            pitch: (row.pitch as string) || null,
            score_coherence_generale:
              typeof row.score_coherence_generale === "number"
                ? row.score_coherence_generale
                : null,
            score_coherence_cv:
              typeof row.score_coherence_cv === "number"
                ? row.score_coherence_cv
                : null,
          };
          addJobs([job]);
          setJobs(getJobs());
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // Rehydrate on hard refresh — restore persisted jobs from Supabase
  useEffect(() => {
    const current = getJobs();
    if (current.length === 0) {
      rehydrateFromServer(query);
    }
  }, [rehydrateFromServer, query]);

  useEffect(() => {
    if (jobs.length > 0 && !selected && activeView === "dashboard") {
      setSelected(jobs[0]);
    }
  }, [jobs, selected, activeView]);

  return (
    <DashboardContext.Provider
      value={{
        activeView,
        setActiveView,
        jobs,
        selected,
        setSelected,
        stats,
        isLoading,
        searching,
        analyzing,
        setAnalyzing,
        currentKeyword,
        searchJobs,
        favorites,
        toggleFavorite,
        isAuthed,
        isGuest,
        resumeText,
        useResumeMatch,
        refreshStats,
        rehydrateFromServer,
        history,
        collectionItems,
        fetchUserHistory,
        fetchUserCollection,
        deleteHistoryItem,
        clearHistory,
        userId,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used within a DashboardProvider");
  return ctx;
};
