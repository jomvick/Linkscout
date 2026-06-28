"use client";

import type { ScoreBreakdown } from "@/lib/types";

interface ExhaustiveScoreViewProps {
  breakdown: ScoreBreakdown;
  matchScore: number;
  verdictAi: string | null;
}

function Gauge({
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
      <div className="flex justify-between text-xs font-medium">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {value}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-slate-800">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ExhaustiveScoreView({
  breakdown,
  matchScore,
  verdictAi,
}: ExhaustiveScoreViewProps) {
  const hasAnyBreakdown =
    breakdown.keyword_alignment !== null ||
    breakdown.skills_match !== null ||
    breakdown.seniority_match !== null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 text-left dark:border-slate-900 dark:bg-slate-950/40">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold font-mono tracking-wider text-slate-400 uppercase">
            Score d'Adéquation Global
          </span>
          <p className="text-xs text-slate-500">
            Calculé en temps réel par LinkScout Intelligence
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <span className="font-mono text-xl font-black text-purple-600 dark:text-purple-400">
            {matchScore}%
          </span>
        </div>
      </div>

      {hasAnyBreakdown && (
        <>
          <div className="h-px bg-slate-100 dark:bg-slate-900" />

          <div className="space-y-3">
            {breakdown.keyword_alignment !== null && (
              <Gauge
                label="Alignement avec votre recherche"
                value={breakdown.keyword_alignment}
                color="bg-indigo-500"
              />
            )}

            {breakdown.skills_match !== null && (
              <Gauge
                label="Match compétences (Votre CV)"
                value={breakdown.skills_match}
                color="bg-purple-500"
              />
            )}

            {breakdown.seniority_match !== null && (
              <Gauge
                label="Niveau d'expérience & Séniorité"
                value={breakdown.seniority_match}
                color="bg-cyan-500"
              />
            )}
          </div>
        </>
      )}

      {verdictAi && (
        <>
          <div className="h-px bg-slate-100 dark:bg-slate-900" />
          <div className="rounded-xl border border-purple-100/40 bg-purple-50/20 p-3 text-xs text-purple-950/80 dark:border-purple-950/30 dark:bg-purple-950/10 dark:text-purple-300/90 leading-relaxed">
            <strong className="font-semibold">Analyse contextuelle :</strong>{" "}
            {verdictAi}
          </div>
        </>
      )}
    </div>
  );
}
