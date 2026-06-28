"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiScrape, apiIntent, apiResumeKeywords, isNaturalLanguage } from "@/lib/api-client";
import { mapJob } from "@/lib/job-mapper";
import type { Job } from "@/lib/types";
import { addJobs, getStats, type JobDraft } from "@/lib/store";
import StatCard from "@/components/landing/StatCard";
import SearchStatusLogs, { type StatusStep } from "@/components/landing/SearchStatusLogs";
import { useToast } from "@/lib/toast-context";
import { createClient } from "@/lib/supabase/client";

const TRENDS = [
  "AI Engineer",
  "Rust Europe",
  "Next.js Freelance",
  "Product Designer",
  "DevOps Kubernetes",
];

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
  const [searchSteps, setSearchSteps] = useState<StatusStep[]>([
    { id: "discover", label: "Recherche des offres sur LinkedIn", status: "idle" },
    { id: "extract", label: "Extraction des descriptions détaillées", status: "idle" },
    { id: "analyze", label: "Analyse IA via Groq (scoring, résumé)", status: "idle" },
    { id: "sync", label: "Synchronisation dans le Dashboard", status: "idle" },
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
      // ── Path A: CV → auto-keywords ─────────────────────────────────────
      stepLabels = [
        "Lecture des compétences extraites du CV",
        "Recherche LinkedIn sur vos top skills",
        "Analyse IA & calcul du Match Score",
        "Synchronisation dans le Dashboard",
      ];
    } else if (isNL) {
      // ── Path C: natural language ────────────────────────────────────────
      stepLabels = [
        "Interprétation de votre recherche par l'IA",
        "Recherche des offres sur LinkedIn",
        "Analyse IA & calcul du Match Score",
        "Synchronisation dans le Dashboard",
      ];
    } else {
      // ── Path B: direct keyword (± CV) ──────────────────────────────────
      stepLabels = [
        "Recherche des offres sur LinkedIn",
        "Extraction des descriptions détaillées",
        "Analyse IA via Groq (scoring, résumé)",
        "Synchronisation dans le Dashboard",
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
          setSearchError("Votre CV est encore en cours d'analyse — réessayez dans quelques secondes.");
          setLoading(false);
          stepTimers.forEach(clearTimeout);
          setSearchSteps((p) => p.map((s) => ({ ...s, status: "idle" as const })));
          return;
        }
        keywords = cvKw.keywords;
        showToast(`🎯 Top skills détectés : ${keywords.join(" · ")}`, "success");
      } else if (isNL) {
        // Path C: natural language interpretation
        const intent = await apiIntent(trimmed);
        if (intent.error || !intent.keywords?.length) {
          keywords = [trimmed];
        } else {
          keywords = intent.keywords;
          if (!intent.fallback) {
            showToast(`🧠 IA : "${intent.intent}" → ${keywords.join(" · ")}`, "success");
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
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
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
        className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-center pt-20 pb-16"
      >
        <div className="w-full max-w-2xl text-center space-y-6">
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
            className="text-4xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-5xl leading-[1.15]"
          >
            Le moteur de recherche
            <br />
            d&apos;opportunités pour les profils tech.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm text-slate-400 dark:text-zinc-500 leading-relaxed max-w-lg mx-auto"
          >
            Trouvez des offres. Comprenez-les avec l&apos;IA. Postulez plus
            intelligemment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <motion.div
              animate={{ opacity: isFocused ? 1 : 0, scale: isFocused ? 1 : 0.92 }}
              transition={{ type: "spring", stiffness: 80, damping: 18, mass: 0.8 }}
              className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-r from-brand/5 via-indigo-500/8 to-sky-500/5 blur-2xl"
            />

            <form onSubmit={handleSubmit}>
              <div className="relative rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl shadow-xl shadow-slate-900/5 dark:shadow-black/30 transition-all duration-300 focus-within:border-brand/50 focus-within:shadow-lg focus-within:shadow-brand/5 focus-within:ring-1 focus-within:ring-brand/20">
                <div className="flex h-17 items-center gap-3 px-5 sm:h-18">
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
                    placeholder="Que recherchez-vous ?"
                    className="flex-1 bg-transparent text-base sm:text-lg text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-zinc-600 outline-none"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCv(f);
                    }}
                  />
                  {cvStatus === "uploading" && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="shrink-0 flex items-center gap-2 rounded-xl bg-indigo-50/80 px-3 py-2 text-xs font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    >
                      <span className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-500/30 dark:border-t-indigo-400" />
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{cvName}</span>
                    </motion.div>
                  )}

                  {cvStatus === "success" && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-indigo-200/60 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300"
                    >
                      <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="truncate max-w-[80px] sm:max-w-[120px] ml-0.5">{cvName}</span>
                      <button
                        type="button"
                        onClick={() => { setCvStatus("idle"); setCvName(null); }}
                        className="ml-1 rounded-full p-0.5 text-indigo-400 hover:bg-indigo-200 hover:text-indigo-800 dark:text-indigo-500 dark:hover:bg-indigo-500/30 dark:hover:text-indigo-200 transition-colors"
                        title="Retirer le CV"
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
                      className="shrink-0 rounded-xl border border-border/60 px-3 py-2 text-slate-400 hover:border-brand/40 hover:text-brand hover:bg-brand/5 transition-all dark:border-slate-700 dark:hover:border-brand/50 dark:hover:text-brand-300"
                      title="Joindre votre CV"
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
                    className="shrink-0 rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </span>
                    ) : (
                      "Rechercher"
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
            className="flex flex-wrap justify-center gap-2 pt-1"
          >
            <span className="text-xs text-slate-400 dark:text-zinc-500 mr-1 self-center">
              🔥
            </span>
            {TRENDS.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                disabled={loading}
                className="rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:border-brand/40 hover:text-brand transition-all disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </motion.div>

          {stats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center justify-center gap-10 pt-6"
            >
              <StatCard
                value={Math.round(stats.totalScraped / 1000)}
                suffix="K+"
                label="Offres indexées"
              />
              <div className="h-8 w-px bg-border/60" />
              <StatCard
                value={Math.round(stats.uniqueCompanies / 1000)}
                suffix="K+"
                label="Entreprises"
              />
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  <span className="text-emerald-500">98</span>
                  <span className="text-emerald-500">%</span>
                </div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                  Offres enrichies IA
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
