"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { apiScrape, apiIntent, apiResumeKeywords, isNaturalLanguage } from "@/lib/api-client";
import { mapJob } from "@/lib/job-mapper";
import type { Job } from "@/lib/types";
import { addJobs, getStats, type JobDraft } from "@/lib/store";
import StatCard from "@/components/landing/StatCard";
import SearchStatusLogs, { type StatusStep } from "@/components/landing/SearchStatusLogs";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";

const TREND_KEYS = ["trendAI", "trendRust", "trendNext", "trendDesigner", "trendDevOps"];

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [cvStatus, setCvStatus] = useState<"idle" | "uploading" | "success">("idle");
  const [cvName, setCvName] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalScraped: number;
    uniqueCompanies: number;
    lastUpdate: number;
  } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const t = useTranslations('Hero');
  const [searchSteps, setSearchSteps] = useState<StatusStep[]>([
    { id: "discover", label: t('stepDiscover'), status: "idle" },
    { id: "extract", label: t('stepExtract'), status: "idle" },
    { id: "analyze", label: t('stepAnalyze'), status: "idle" },
    { id: "sync", label: t('stepSync'), status: "idle" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const uploadCv = async (file: File) => {
    try {
      setCvStatus("uploading");
      setCvName(file.name);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("Vous devez être connecté pour uploader un CV", "error");
        setCvStatus("idle");
        setCvName(null);
        return;
      }

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("resumes").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadErr) {
        showToast(`Erreur Storage: ${uploadErr.message}`, "error");
        setCvStatus("idle");
        setCvName(null);
        return;
      }

      const res = await fetch("/api/resume", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_path: path, file_name: file.name })
      });
      const data = await res.json();
      if (data.success) {
        showToast("CV uploadé avec succès ! L'analyse est en cours.", "success");
        setCvStatus("success");
      } else {
        showToast(data.error || "Erreur d'upload", "error");
        setCvStatus("idle");
        setCvName(null);
      }
    } catch {
      showToast("Erreur réseau", "error");
      setCvStatus("idle");
      setCvName(null);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    setStats(getStats());
    const id = setInterval(() => setStats(getStats()), 10_000);
    return () => clearInterval(id);
  }, []);

  const advanceStep = (index: number) => {
    setSearchSteps((prev) =>
      prev.map((s, i) => {
        if (i === index) return { ...s, status: "loading" as const };
        if (i < index) return { ...s, status: "success" as const };
        return s;
      }),
    );
  };


  const handleSearch = async (keyword: string) => {
    const trimmed = keyword.trim();
    if ((!trimmed && cvStatus !== "success") || loading) return;
    setLoading(true);
    setSearchError("");
    setQuery(trimmed);

    // ── Determine which path we're on ──────────────────────────────────────
    // Path A: CV only (no keyword)
    // Path B: CV + keyword (direct scrape, boosted by CV in DB for match scoring)
    // Path C: natural language phrase (Groq interprets → keywords)
    const hasCv = cvStatus === "success";
    const isNL = trimmed ? isNaturalLanguage(trimmed) : false;

    let keywords: string[] = [];
    let stepLabels: [string, string, string, string];

    if (!trimmed && hasCv) {
      stepLabels = [
        t('stepCvReading'),
        t('stepCvSearch'),
        t('stepCvAnalyze'),
        t('stepSyncResults'),
      ];
    } else if (isNL) {
      stepLabels = [
        t('stepNlInterpret'),
        t('stepNlSearch'),
        t('stepNlAnalyze'),
        t('stepSyncResults'),
      ];
    } else {
      stepLabels = [
        t('stepDirectSearch'),
        t('stepDirectExtract'),
        t('stepDirectAnalyze'),
        t('stepSyncResults'),
      ];
    }

    setSearchSteps([
      { id: "discover", label: stepLabels[0], status: "idle" },
      { id: "extract",  label: stepLabels[1], status: "idle" },
      { id: "analyze",  label: stepLabels[2], status: "idle" },
      { id: "sync",     label: stepLabels[3], status: "idle" },
    ]);

    advanceStep(0);

    const stepTimers = [
      setTimeout(() => advanceStep(1), 1500),
      setTimeout(() => advanceStep(2), 3500),
      setTimeout(() => advanceStep(3), 5000),
    ];

    try {
      // ── Resolve keywords ───────────────────────────────────────────────
      if (!trimmed && hasCv) {
        // Path A: fetch CV skills
        const cvKw = await apiResumeKeywords();
        if (!cvKw.hasResume || cvKw.keywords.length === 0) {
          setSearchError(t('resumeAnalyzing'));
          setLoading(false);
          stepTimers.forEach(clearTimeout);
          setSearchSteps((p) => p.map((s) => ({ ...s, status: "idle" as const })));
          return;
        }
        keywords = cvKw.keywords;
        showToast(`🎯 Top skills detected: ${keywords.join(" · ")}`, "success");
      } else if (isNL) {
        // Path C: natural language interpretation
        const intent = await apiIntent(trimmed);
        if (intent.error || !intent.keywords?.length) {
          keywords = [trimmed];
        } else {
          keywords = intent.keywords;
          if (!intent.fallback) {
            showToast(`🧠 AI: "${intent.intent}" → ${keywords.join(" · ")}`, "success");
          }
        }
      } else {
        // Path B: direct keyword
        keywords = [trimmed];
      }

      // ── Run scrape for each keyword (parallel, limit 10 each) ────────────
      const scrapeLimit = Math.max(5, Math.floor(20 / keywords.length));
      const results = await Promise.all(
        keywords.map((kw) => apiScrape(kw, scrapeLimit))
      );

      // Merge and deduplicate by URL
      const seen = new Set<string>();
      const allJobs: JobDraft[] = [];
      for (const data of results) {
        if (data.success && Array.isArray(data.jobs)) {
          for (const j of data.jobs) {
            const key = (j.url as string) || (j.title as string);
            if (key && !seen.has(key)) {
              seen.add(key);
              allJobs.push(mapJob(j as Record<string, unknown>));
            }
          }
        }
      }

      if (allJobs.length > 0) addJobs(allJobs);

      // ── Persist to search_history (non-blocking) ───────────────────────────
      if (keywords.length > 0) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Save one entry per keyword (keywords from CV or NL can be multiple)
          for (const kw of keywords) {
            supabase.from("search_history").insert({
              user_id: user.id,
              keyword: kw,
              results_count: allJobs.length,
            }).then(({ error }) => {
              if (error) console.warn("[History] Insert failed:", error.message);
            });
          }
        }
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSearchError(msg);
      setSearchSteps((prev) =>
        prev.map((s) => ({ ...s, status: "idle" as const })),
      );
      setLoading(false);
      stepTimers.forEach(clearTimeout);
      return;
    }

    stepTimers.forEach(clearTimeout);
    setSearchSteps((prev) =>
      prev.map((s) => ({ ...s, status: "success" as const })),
    );
    await new Promise((r) => setTimeout(r, 400));
    // Use the resolved keywords for the dashboard query param (fallback to raw trimmed)
    const dashQ = keywords.length > 0 ? keywords[0] : trimmed;
    router.push(`/dashboard?q=${encodeURIComponent(dashQ)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <>
      <main
        id="hero"
        className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-center pt-14 pb-16 sm:pb-20"
      >
        <div className="w-full max-w-3xl text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1 text-[11px] font-semibold tracking-wide text-slate-400 dark:text-zinc-500 uppercase"
          >
            <span className="text-brand">✦</span>
            LinkScout
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          >
            {t('title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base text-slate-400 dark:text-zinc-500 leading-relaxed max-w-xl mx-auto"
          >
            {t('subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-2xl mx-auto"
          >
            <motion.div
              animate={{ opacity: isFocused ? 1 : 0, scale: isFocused ? 1 : 0.92 }}
              transition={{ type: "spring", stiffness: 80, damping: 18, mass: 0.8 }}
              className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-r from-brand/5 via-indigo-500/8 to-sky-500/5 blur-2xl"
            />

            <form onSubmit={handleSubmit}>
              <div className="relative rounded-2xl border border-border/60 bg-white/95 dark:bg-surface/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 transition-all duration-300 focus-within:border-brand/60 focus-within:shadow-2xl focus-within:shadow-brand/10 focus-within:ring-1 focus-within:ring-brand/20 hover:shadow-2xl hover:shadow-slate-900/15 dark:hover:shadow-black/50">
                <div className="flex h-14 items-center gap-2.5 px-4 sm:h-16">
                  <svg
                    className="w-5 h-5 shrink-0 text-slate-300 dark:text-zinc-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={(e) => { setQuery(e.target.value); setSearchError(""); }}
                    placeholder={t('searchPlaceholder')}
                    aria-label={t('searchAria')}
                    className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-zinc-600 outline-none"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    aria-label={t('uploadAria')}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCv(file);
                    }}
                  />
                  {cvStatus === "uploading" && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="shrink-0 flex items-center gap-2 rounded-xl bg-indigo-50/80 px-3 py-3 text-xs font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    >
                      <span className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-500/30 dark:border-t-indigo-400" />
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{cvName}</span>
                    </motion.div>
                  )}

                  {cvStatus === "success" && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-indigo-200/60 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 min-h-[48px]"
                    >
                      <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="truncate max-w-[80px] sm:max-w-[120px] ml-0.5">{cvName}</span>
                      <button
                        type="button"
                        onClick={() => { setCvStatus("idle"); setCvName(null); }}
                        className="ml-1 rounded-full p-0.5 text-indigo-400 hover:bg-indigo-200 hover:text-indigo-800 dark:text-indigo-500 dark:hover:bg-indigo-500/30 dark:hover:text-indigo-200 transition-colors"
                        title={t('removeResume')}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  )}

                  {cvStatus === "idle" && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 rounded-xl border border-border/60 px-3 text-slate-400 hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-all dark:border-slate-700 dark:hover:border-brand/50 dark:hover:text-brand-300 min-h-[48px] min-w-[48px] flex items-center justify-center"
                      title={t('attachResume')}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.656 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                      </svg>
                      {/* Using a more semantic 'attach document' icon instead of the generic one */}
                      <svg className="h-5 w-5 absolute inset-auto opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ display: 'none' }}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || (!query.trim() && cvStatus !== "success")}
                    className="shrink-0 rounded-xl bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] min-h-[48px] flex items-center justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </span>
                    ) : (
                      t('searchButton')
                    )}
                  </button>
                </div>
              </div>
            </form>

            <AnimatePresence mode="wait">
              {loading && <SearchStatusLogs steps={searchSteps} />}
            </AnimatePresence>
            {searchError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 dark:text-red-400 text-center mt-2"
              >
                {searchError}
              </motion.p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap justify-center gap-1.5"
          >
            <span className="text-xs text-slate-400 dark:text-zinc-500 mr-1 self-center">
              {t('trendsLabel')}
            </span>
            {TREND_KEYS.map((key) => {
              const trendLabel = t(key);
              return (
                <button
                  key={key}
                  onClick={() => handleSearch(trendLabel)}
                  disabled={loading}
                  className="rounded-lg border border-border bg-surface px-4 text-[11px] text-slate-500 dark:text-zinc-400 hover:border-brand/40 hover:text-brand transition-all disabled:opacity-40 min-h-[48px] flex items-center justify-center"
                >
                  {trendLabel}
                </button>
              );
            })}
          </motion.div>

          {stats && stats.totalScraped > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center justify-center gap-10 pt-4"
            >
              <StatCard
                value={Math.round(stats.totalScraped / 1000)}
                suffix="K+"
                label={t('statsJobs')}
              />
              <div className="h-8 w-px bg-border/60" />
              <StatCard
                value={Math.round(stats.uniqueCompanies / 1000)}
                suffix="K+"
                label={t('statsCompanies')}
              />
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  <span className="text-emerald-500">98</span>
                  <span className="text-emerald-500">%</span>
                </div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                  {t('statsAiEnriched')}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {loading && (
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-zinc-800">
          <div className="h-full w-full bg-brand rounded-full animate-[slide-load_1.5s_ease-in-out_infinite]" />
        </div>
      )}
    </>
  );
}
