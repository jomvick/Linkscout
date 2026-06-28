"use client";

import type { Job } from "@/lib/types";
import ResultCard from "./ResultCard";
import DetailPanel from "./DetailPanel";
import StatsOverview from "./StatsOverview";
import { motion, AnimatePresence } from "framer-motion";

interface SearchViewProps {
  jobs: Job[];
  selected: Job | null;
  onSelect: (job: Job) => void;
  onCloseDetail?: () => void;
  analyzing: boolean;
  onAnalyze: (job: Job) => void;
  favorites: Set<string>;
  onToggleFavorite: (jobId: string) => void;
  keyword?: string;
  onSuggestionSearch?: (keyword: string) => void;
}

export default function SearchView({
  jobs,
  selected,
  onSelect,
  onCloseDetail,
  analyzing,
  onAnalyze,
  favorites,
  onToggleFavorite,
  keyword = "",
  onSuggestionSearch,
}: SearchViewProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20">
            <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-text-primary mb-1">
            Prêt à trouver des opportunités ?
          </p>
          <p className="text-sm text-text-secondary/60 leading-relaxed mb-6">
            Tapez un rôle, une techno ou un lieu dans la barre de recherche.
            L'IA analysera chaque offre et vous donnera un score de match, un
            résumé, et une estimation salariale.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Développeur React", "Data Engineer", "DevOps", "Product Designer"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionSearch?.(suggestion)}
                className="rounded-lg border border-border/60 bg-surface px-3.5 py-2 text-sm text-text-secondary/70 hover:border-brand/30 hover:text-brand hover:bg-brand/5 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-90 shrink-0 space-y-2 overflow-y-auto border-r border-border/60 p-3 max-lg:min-w-0 max-lg:w-full">
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-medium text-text-secondary/40 px-1 pb-1 uppercase tracking-wider"
          >
            {jobs.length} résultat{jobs.length !== 1 ? "s" : ""}
          </motion.div>
        )}
        <AnimatePresence mode="popLayout">
          {jobs.map((job, index) => (
            <ResultCard
              key={job.id}
              job={job}
              isActive={selected?.id === job.id}
              onClick={() => onSelect(job)}
              index={index}
              isFavorite={favorites.has(job.id)}
              onToggleFavorite={() => onToggleFavorite(job.id)}
            />
          ))}
        </AnimatePresence>
      </aside>

      <main className="flex-1 overflow-y-auto bg-surface min-w-0 relative">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 48 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
              className="absolute inset-0 bg-surface z-10 shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.2)] dark:shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.4)]"
            >
              <DetailPanel
                job={selected}
                analyzing={analyzing}
                onAnalyze={() => onAnalyze(selected)}
                isFavorite={favorites.has(selected.id)}
                onToggleFavorite={() => onToggleFavorite(selected.id)}
                onClose={onCloseDetail}
                keyword={keyword}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            >
              <StatsOverview />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
