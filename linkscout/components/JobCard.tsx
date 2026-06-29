"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job;
  onSelect: (job: Job) => void;
  selected: boolean;
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return null;
  const colors =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
      : score >= 50
        ? "bg-amber-50 text-amber-700 border-amber-200/60"
        : "bg-slate-100 text-slate-500 border-slate-200/60";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${colors}`}
    >
      {score}%
    </span>
  );
}

function buildAvatarSources(job: Job): string[] {
  const slug = job.company?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  const sources: string[] = [];
  if (job.logo_url) sources.push(job.logo_url);
  if (slug) {
    for (const tld of ["com", "io", "ai", "co"]) {
      const url = `https://unavatar.io/${slug}.${tld}?fallback=false`;
      if (!sources.includes(url)) sources.push(url);
    }
  }
  return sources;
}

function Avatar({ job }: { job: Job }) {
  const sources = buildAvatarSources(job);
  const [srcIndex, setSrcIndex] = useState(0);
  const allFailed = srcIndex >= sources.length;

  if (!allFailed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        <img
          key={sources[srcIndex]}
          src={sources[srcIndex]}
          alt=""
          className="h-full w-full object-contain"
          onError={() => setSrcIndex((i) => i + 1)}
        />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-semibold text-brand text-sm">
      {job.company?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

export default function JobCard({ job, onSelect, selected }: Props) {
  return (
    <button
      onClick={() => onSelect(job)}
      className={`group relative w-full text-left rounded-xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer
        ${
          selected
            ? "border-blue-200 bg-blue-50/40 shadow-sm"
            : "border-slate-200/80 shadow-sm hover:border-blue-200"
        }`}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-brand" />
      )}

      <div className="flex items-start gap-4">
        <Avatar job={job} />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand transition-colors line-clamp-1">
              {job.title}
            </h3>
            <ScorePill score={job.match_score} />
          </div>

          <p className="text-xs font-medium text-slate-700">{job.company}</p>

          <div className="flex items-center justify-between mt-2">
            {job.location ? (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <svg
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
                <span className="truncate">{job.location}</span>
              </div>
            ) : <div />}
            <span className="text-[10px] font-bold tracking-wider text-blue-600/70 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100/50">
              LinkedIn
            </span>
          </div>

          {/* Affichage auto de l'IA */}
          {(job.score_breakdown || job.verdict_ai) && (
            <div className="mt-3 border-t border-slate-100/80 pt-3 space-y-2">
              {job.score_breakdown && (
                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500 flex-wrap">
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
                      Expérience: {job.score_breakdown.seniority_match}%
                    </span>
                  )}
                </div>
              )}
              {job.verdict_ai && (
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <span className="font-semibold text-brand mr-1">IA:</span>
                  {job.verdict_ai}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
