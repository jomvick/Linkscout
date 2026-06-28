"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CollectionWithJob } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useDashboard } from "@/context/DashboardContext";
import EmptyState from "./EmptyState";

export default function FavoritesView() {
  const { toggleFavorite } = useDashboard();
  const [items, setItems] = useState<CollectionWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("collections")
        .select("*, job:job_id(*)")
        .eq("status", "bookmarked")
        .order("created_at", { ascending: false });
      if (data) setItems(data as unknown as CollectionWithJob[]);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = useCallback(
    async (jobId: string) => {
      await toggleFavorite(jobId);
      fetchFavorites();
      if (selectedId === jobId) setSelectedId(null);
    },
    [toggleFavorite, fetchFavorites, selectedId],
  );

  const selected = useMemo(
    () => items.find((i) => i.job_id === selectedId) || items[0] || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (items.length > 0 && !selectedId) {
      setSelectedId(items[0].job_id);
    }
  }, [items, selectedId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex">
        <EmptyState
          icon={
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
          title="Aucun favori"
          description="Cliquez sur l'étoile sur une offre pour l'ajouter à vos favoris."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold text-text-primary">
            Favoris
          </h1>
          <p className="text-xs text-text-secondary/60">
            {items.length} offre{items.length > 1 ? "s" : ""} sauvegardée{items.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const job = item.job;
              const displayScore = job.match_score ?? null;
              const isSelected = selectedId === item.job_id;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setSelectedId(item.job_id)}
                  className={`group cursor-pointer rounded-2xl border bg-surface p-5 transition-all duration-150 ${
                    isSelected
                      ? "border-brand/30 shadow-sm shadow-brand/5"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand bg-brand-light px-2 py-0.5 rounded-md">
                          {job.company}
                        </span>
                        {job.location && (
                          <span className="text-xs text-text-secondary/50 font-mono">
                            {job.location}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-text-primary">
                        {job.title}
                      </h4>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-text-secondary/50 uppercase block leading-tight">
                          Match
                        </span>
                        <span className={`text-xl font-black font-mono ${displayScore != null ? "text-brand" : "text-text-secondary/30"}`}>
                          {displayScore != null ? `${displayScore}%` : "—"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.job_id);
                        }}
                        className="text-[11px] font-medium text-text-secondary/40 hover:text-red-400 transition-colors underline underline-offset-4"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {selected && (
          <div className="w-80 shrink-0 border-l border-border overflow-y-auto p-5 space-y-5 hidden lg:block">
            <div className="space-y-1">
              <h3 className="text-xs font-bold font-mono text-text-secondary/50 uppercase tracking-wider">
                Analyse de l'opportunité
              </h3>
              <p className="text-sm font-semibold text-text-primary">{selected.job.title}</p>
              <p className="text-xs text-text-secondary/60">{selected.job.company}</p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-surface p-4">
              {selected.job.match_score != null && (
                <ScoreBar label="Score global" value={selected.job.match_score} color="var(--color-brand)" />
              )}
              {selected.job.score_breakdown && (
                <>
                  <div className="h-px bg-border/60" />
                  <ScoreBar label="Alignement mots-clés" value={selected.job.score_breakdown.keyword_alignment ?? 0} color="var(--color-match-high)" />
                  <ScoreBar label="Correspondance compétences" value={selected.job.score_breakdown.skills_match ?? 0} color="var(--color-match-mid)" />
                  <ScoreBar label="Niveau hiérarchique" value={selected.job.score_breakdown.seniority_match ?? 0} color="var(--color-accent)" />
                </>
              )}

              {selected.job.tech_stack && selected.job.tech_stack.length > 0 && (
                <>
                  <div className="h-px bg-border/60" />
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold font-mono text-text-secondary/40 uppercase tracking-wider">
                      Stack technique
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selected.job.tech_stack.map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-canvas text-text-secondary border border-border/50"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selected.job.verdict_ai && (
                <>
                  <div className="h-px bg-border/60" />
                  <p className="text-xs text-text-secondary/70 leading-relaxed">
                    {selected.job.verdict_ai}
                  </p>
                </>
              )}
            </div>

            {selected.job.url && (
              <a
                href={selected.job.url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-medium text-text-secondary/50 hover:text-brand transition-colors underline underline-offset-4 text-center"
              >
                Ouvrir l'offre originale ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary/70">{label}</span>
        <span className="font-mono font-bold text-text-primary">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
