"use client";

import { motion } from "framer-motion";
import { triggerOnActivationKey } from "@/lib/a11y";
import type { Job } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import MatchScore from "./MatchScore";
import SkillBadge from "./SkillBadge";
import CompanyLogo from "./CompanyLogo";

interface ResultCardProps {
  job: Job;
  isActive: boolean;
  onClick: () => void;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSave?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Auj.";
  if (days === 1) return "Hier";
  return `${days}j`;
}

export default function ResultCard({
  job,
  isActive,
  onClick,
  index,
  isFavorite,
  onToggleFavorite,
}: ResultCardProps) {
  const techStack = job.tech_stack ?? [];

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    triggerOnActivationKey(e, onClick);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.025, duration: 0.2, ease: "easeOut" }}
      onClick={onClick}
      className={`
        group relative cursor-pointer rounded-xl border bg-surface p-3.5 transition-all duration-150
        ${
          isActive
            ? "border-brand/30 bg-brand/3 shadow-sm shadow-brand/5"
            : "border-border hover:border-border/80 hover:bg-surface/80"
        }
      `}
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={`Voir l'offre ${job.title} chez ${job.company}`}
      onKeyDown={handleCardKeyDown}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo companyName={job.company} logoUrl={job.logo_url} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-text-primary leading-snug">
                  {job.title}
                </h3>
                {job.source && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase shrink-0 ${
                    job.source === 'wttj' ? 'bg-yellow-500/20 text-yellow-600' :
                    job.source === 'indeed' ? 'bg-blue-500/20 text-blue-600' :
                    job.source.includes('linkedin') ? 'bg-blue-600/10 text-blue-600 border border-blue-600/20' :
                    'bg-slate-500/20 text-slate-600'
                  }`}>
                    {job.source.replace('_guest', '')}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-text-secondary/70 truncate">
                {job.company}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
              />
              <MatchScore score={job.match_score} />
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-text-secondary/60">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                {job.location}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {job.salary}
              </span>
            )}
            {job.created_at && (
              <span className="inline-flex items-center gap-1">
                <svg
                  className="h-3 w-3"
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
                {timeAgo(job.created_at)}
              </span>
            )}
            {job.contract_type && (
              <span className="rounded-md border border-border/40 bg-canvas/50 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-secondary/50">
                {job.contract_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {techStack.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {techStack.slice(0, 5).map((tech) => (
            <SkillBadge key={tech} name={tech} compact />
          ))}
          {techStack.length > 5 && (
            <span className="text-[10px] font-mono text-text-secondary/40">
              +{techStack.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Affichage auto de l'IA */}
      {(job.score_breakdown || job.verdict_ai) && (
        <div className="mt-3 border-t border-border/40 pt-3 space-y-2">
          {job.score_breakdown && (
            <div className="flex items-center gap-3 text-[10px] font-medium text-text-secondary/80 flex-wrap">
              {job.score_breakdown.keyword_alignment != null && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Mots-clés: {job.score_breakdown.keyword_alignment}%
                </span>
              )}
              {job.score_breakdown.skills_match != null && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Compétences: {job.score_breakdown.skills_match}%
                </span>
              )}
              {job.score_breakdown.seniority_match != null && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Exp: {job.score_breakdown.seniority_match}%
                </span>
              )}
            </div>
          )}
          {job.verdict_ai && (
            <p className="text-[11px] text-text-secondary/90 line-clamp-2 leading-relaxed bg-surface/50 rounded-lg p-2 border border-border/40">
              <span className="font-semibold text-brand mr-1">IA:</span>
              {job.verdict_ai}
            </p>
          )}
        </div>
      )}
    </motion.article>
  );
}
