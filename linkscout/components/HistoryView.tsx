"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchHistory, Job } from "@/lib/types";
import { apiAnalyze } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { mapJobRecord } from "@/lib/server-jobs";
import { useDashboard } from "@/context/DashboardContext";
import EmptyState from "./EmptyState";
import OpportunityCard from "./OpportunityCard";
import DetailPanel from "./DetailPanel";

/* ── helpers ───────────────────────────────────────────── */
function groupByDate(items: SearchHistory[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; items: SearchHistory[] }[] = [
    { label: "Aujourd'hui", items: [] },
    { label: "Hier", items: [] },
    { label: "Cette semaine", items: [] },
    { label: "Plus ancien", items: [] },
  ];

  for (const item of items) {
    const d = new Date(item.created_at);
    if (d.toDateString() === today.toDateString()) groups[0].items.push(item);
    else if (d.toDateString() === yesterday.toDateString())
      groups[1].items.push(item);
    else if (d >= weekAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  );
}

/* ── HistoryView ───────────────────────────────────────── */
interface HistoryViewProps {
  /** Optionnel — permet encore de relancer dans la barre de recherche. */
  onOpenSearch?: (keyword: string) => void;
}

export default function HistoryView({ onOpenSearch }: HistoryViewProps) {
  const { favorites, toggleFavorite } = useDashboard();

  /* liste */
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  /* vue résultats */
  const [selectedHistory, setSelectedHistory] = useState<SearchHistory | null>(
    null,
  );
  const [historyJobs, setHistoryJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  /* ── fetch de la liste ── */
  const fetchHistory = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("search_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setHistory(data as SearchHistory[]);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ── suppression ── */
  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from("search_history").delete().eq("id", id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleClearAll = useCallback(async () => {
    const supabase = createClient();
    await supabase
      .from("search_history")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setHistory([]);
  }, []);

  /* ── consultation d'un historique (reste dans la section) ── */
  const handleView = useCallback(async (item: SearchHistory) => {
    setSelectedHistory(item);
    setSelectedJob(null);
    setHistoryJobs([]);
    setLoadingJobs(true);

    try {
      const supabase = createClient();
      const kw = item.keyword.trim();

      /* Cherche dans les jobs persistés en base par titre ou description */
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .or(
          `title.ilike.%${kw}%,description.ilike.%${kw}%,company.ilike.%${kw}%`,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        const jobs = data.map((row) =>
          mapJobRecord(row as Record<string, unknown>),
        );
        setHistoryJobs(jobs);
        setSelectedJob(jobs[0]);
      }
    } catch {
      /* laisse la liste vide */
    }

    setLoadingJobs(false);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedHistory(null);
    setHistoryJobs([]);
    setSelectedJob(null);
  }, []);

  /* ── analyse IA d'un job dans les résultats historique ── */
  const handleAnalyze = useCallback(
    async (job: Job) => {
      if (!job.description || job.summary) return;
      setAnalyzing(true);
      try {
        const data = await apiAnalyze({
          jobId: job.id,
          job,
          keyword: selectedHistory?.keyword ?? "",
        });
        if (data.success && data.analysis) {
          const updated: Job = { ...job, ...data.analysis };
          setHistoryJobs((prev) =>
            prev.map((j) => (j.id === updated.id ? updated : j)),
          );
          setSelectedJob((prev) => (prev?.id === updated.id ? updated : prev));
        }
      } catch {
        /* silent */
      }
      setAnalyzing(false);
    },
    [selectedHistory],
  );

  const groups = useMemo(() => groupByDate(history), [history]);

  /* ═══════════════════════════════════════════════════════
     VUE RÉSULTATS — split-pane calqué sur la recherche
  ═══════════════════════════════════════════════════════ */
  if (selectedHistory) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── barre de retour ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary/70 hover:bg-canvas hover:text-text-primary transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Historique
          </button>

          <div className="h-4 w-px bg-border/60" />

          <svg
            className="h-4 w-4 shrink-0 text-text-secondary/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-sm font-semibold text-text-primary">
            {selectedHistory.keyword}
          </span>

          {!loadingJobs && (
            <span className="ml-1 text-xs text-text-secondary/50 tabular-nums">
              {historyJobs.length} résultat{historyJobs.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* relancer dans la recherche si onOpenSearch fourni */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={() => onOpenSearch(selectedHistory.keyword)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-text-secondary/70 hover:border-brand/40 hover:text-brand transition-colors"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Relancer la recherche
            </button>
          )}
        </div>

        {/* ── split-pane ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* colonne gauche : liste de jobs */}
          <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-border">
            {loadingJobs ? (
              <Spinner />
            ) : historyJobs.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas">
                  <svg
                    className="h-5 w-5 text-text-secondary/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Aucun résultat
                  </p>
                  <p className="mt-1 text-xs text-text-secondary/50 leading-relaxed">
                    Aucune offre trouvée en base pour «{" "}
                    {selectedHistory.keyword} ». Relancez la recherche pour
                    récupérer des données fraîches.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <AnimatePresence>
                  {historyJobs.map((job, i) => (
                    <OpportunityCard
                      key={job.id}
                      job={job}
                      isActive={selectedJob?.id === job.id}
                      onClick={() => {
                        setSelectedJob(job);
                        if (!job.summary) handleAnalyze(job);
                      }}
                      index={i}
                      isFavorite={favorites.has(job.id)}
                      onToggleFavorite={() => toggleFavorite(job.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* colonne droite : panneau détail */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {selectedJob ? (
              <DetailPanel
                job={selectedJob}
                analyzing={analyzing}
                onAnalyze={() => handleAnalyze(selectedJob)}
                isFavorite={favorites.has(selectedJob.id)}
                onToggleFavorite={() => toggleFavorite(selectedJob.id)}
                keyword={selectedHistory.keyword}
              />
            ) : !loadingJobs && historyJobs.length > 0 ? (
              <div className="flex flex-1 items-center justify-center text-text-secondary/30">
                <p className="text-sm">Sélectionnez une offre</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     VUE LISTE D'HISTORIQUE
  ═══════════════════════════════════════════════════════ */
  if (loading) return <Spinner />;

  if (history.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            className="w-6 h-6 text-text-secondary/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        title="Aucun historique"
        description="Lancez une recherche pour voir votre historique ici."
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* en-tête */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-sm font-semibold text-text-primary">
            Historique
          </h1>
          <p className="mt-0.5 text-xs text-text-secondary/60">
            {history.length} recherche{history.length > 1 ? "s" : ""} effectuée
            {history.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary/60 hover:border-red-400/30 hover:text-red-400 transition-colors"
        >
          Tout effacer
        </button>
      </div>

      {/* liste groupée */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="mb-2.5 px-1 font-mono text-[11px] font-bold uppercase tracking-wider text-text-secondary/40">
              {group.label}
            </h3>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {group.items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18, delay: i * 0.02 }}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-surface px-4 py-3 transition-all duration-150 hover:border-border/80 hover:bg-surface/80"
                  >
                    {/* icône */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-text-secondary/40">
                      <svg
                        className="h-4 w-4"
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
                    </div>

                    {/* infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-text-primary">
                          {item.keyword}
                        </span>
                        <span className="shrink-0 rounded-full border border-border/50 bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-text-secondary/60">
                          {item.results_count}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-text-secondary/40">
                        {new Date(item.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-1.5 opacity-0 transition-all duration-150 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleView(item)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:border-brand/40 hover:bg-brand/5 hover:text-brand transition-colors"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Voir les offres
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Supprimer"
                        className="rounded-lg p-1.5 text-text-secondary/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
