"use client";

import type { Job } from "@/lib/types";
import MatchScore from "./MatchScore";
import ExhaustiveScoreView from "./ExhaustiveScoreView";
import { LogoDisplay, timeAgo, DetailRow, Section } from "./detail-panel-helpers";

interface Props {
  job: Job;
  analyzing: boolean;
  onAnalyze: () => void;
}

export default function DetailPanelOverview({ job, analyzing, onAnalyze }: Props) {
  const slug = job.company?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-canvas/50 p-4 space-y-0">
        {job.location && (
          <DetailRow label="Localisation" value={job.location} />
        )}
        {job.salary && (
          <DetailRow label="Salaire" value={job.salary} />
        )}
        {job.contract_type && (
          <DetailRow label="Contrat" value={job.contract_type} />
        )}
        {job.created_at && (
          <DetailRow label="Publiée" value={timeAgo(job.created_at)} />
        )}
        {job.source && (
          <DetailRow
            label="Source"
            value={job.source.includes("linkedin") ? "LinkedIn" : job.source}
          />
        )}
      </div>

      {job.match_score != null && job.score_breakdown && (
        <ExhaustiveScoreView
          breakdown={job.score_breakdown}
          matchScore={job.match_score}
          verdictAi={job.verdict_ai}
        />
      )}
      {job.match_score != null && !job.score_breakdown && (
        <Section label="Score de compatibilité">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  job.match_score >= 90
                    ? "bg-linear-to-r from-emerald-500 to-emerald-400"
                    : job.match_score >= 70
                      ? "bg-linear-to-r from-amber-500 to-amber-400"
                      : "bg-linear-to-r from-blue-500 to-blue-400"
                }`}
                style={{ width: `${job.match_score}%` }}
              />
            </div>
            <span className="text-sm font-bold text-text-primary font-mono tabular-nums">
              {job.match_score}%
            </span>
          </div>
        </Section>
      )}

      <Section label="Résumé IA">
        {analyzing && !job.summary ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary py-2">
            <span className="h-3.5 w-3.5 border-2 border-border border-t-brand rounded-full animate-spin" />
            Analyse en cours...
          </div>
        ) : job.summary ? (
          <div className="rounded-xl border border-brand/10 bg-brand/3 p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0 text-brand"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
              <p className="text-sm text-text-primary leading-relaxed">
                {job.summary}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            <button
              type="button"
              onClick={onAnalyze}
              className="text-brand hover:underline font-medium inline"
            >
              Analyser avec l'IA
            </button>
            <span> pour générer un résumé</span>
          </div>
        )}
      </Section>

      {job.description && (
        <details className="group rounded-xl border border-border/40 bg-canvas/50">
          <summary className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors [&::-webkit-details-marker]:hidden">
            <svg
              className="h-3.5 w-3.5 transition-transform group-open:rotate-90 text-text-secondary/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Description originale
          </summary>
          <div className="px-4 pb-4 border-t border-border/30 pt-3">
            <p className="text-xs text-text-secondary/70 leading-relaxed whitespace-pre-line">
              {job.description.replace(/<[^>]*>/g, "")}
            </p>
          </div>
        </details>
      )}

      {job.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover font-medium"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Voir l'offre originale
        </a>
      )}
    </>
  );
}
