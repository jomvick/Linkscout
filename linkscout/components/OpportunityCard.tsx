"use client";

import { motion } from "framer-motion";
import { triggerOnActivationKey } from "@/lib/a11y";
import type { Job } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import CompanyLogo from "./CompanyLogo";

interface OpportunityCardProps {
  job: Job;
  isActive: boolean;
  onClick: () => void;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function MatchScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 90
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : score >= 70
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border ${color} px-1.5 py-0.5`}
    >
      <span className="text-[10px] font-bold">{score}%</span>
      <svg
        className="h-2.5 w-2.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `${days} j`;
}

export default function OpportunityCard({
  job,
  isActive,
  onClick,
  index,
  isFavorite,
  onToggleFavorite,
}: OpportunityCardProps) {
  const techStack = job.tech_stack ?? [];

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    triggerOnActivationKey(e, onClick);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        delay: index * 0.03,
        type: "spring",
        stiffness: 350,
        damping: 28,
      }}
      onClick={onClick}
      className={`
        group relative cursor-pointer rounded-xl border bg-surface p-3 shadow-sm transition-all duration-200
        hover:shadow-md
        ${
          isActive
            ? "border-l-4 border-l-brand border-brand/20 dark:border-brand/40 bg-linear-to-br from-brand/4 via-transparent to-accent/4 shadow-md shadow-brand/2"
            : "border-border hover:border-brand/30"
        }
      `}
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={`Voir l'offre ${job.title} chez ${job.company}`}
      onKeyDown={handleCardKeyDown}
    >
      <div className="flex items-start gap-2.5">
        <CompanyLogo companyName={job.company} logoUrl={job.logo_url} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">
                {job.title}
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary truncate">
                {job.company}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
              />
              <MatchScoreBadge score={job.match_score} />
            </div>
          </div>

          {/* Info row */}
          {job.salary || job.created_at || job.contract_type || job.location ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-text-secondary/70">
              {job.location && (
                <span className="inline-flex items-center gap-0.5">
                  📍{job.location}
                </span>
              )}
              {job.salary ? (
                <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                  💰{job.salary}
                </span>
              ) : null}
              {job.created_at ? (
                <span className="inline-flex items-center gap-0.5">
                  📅{timeAgo(job.created_at)}
                </span>
              ) : null}
              {job.contract_type ? (
                <span className="rounded-md border border-border/60 bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-secondary/60">
                  {job.contract_type}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tech stack */}
      {techStack.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-medium text-text-secondary/80 border border-border/40"
              >
                {tech}
              </span>
            ))}
            {techStack.length > 4 && (
              <span className="font-mono text-[10px] text-text-secondary/40">
                +{techStack.length - 4}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.article>
  );
}
