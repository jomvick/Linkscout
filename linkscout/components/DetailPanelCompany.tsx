"use client";

import type { Job } from "@/lib/types";
import { Section } from "./detail-panel-helpers";

interface Props {
  job: Job;
}

function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
      <span className="text-lg font-bold text-brand">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </span>
    </div>
  );
}

export default function DetailPanelCompany({ job }: Props) {
  const slug = job.company?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  const logoUrl = job.logo_url || `https://logo.clearbit.com/${slug}.com`;

  return (
    <div className="space-y-5">
      <Section label="Entreprise">
        <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-canvas/50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-border/60 shadow-sm">
            <img
              src={logoUrl}
              alt={`${job.company} logo`}
              className="h-full w-full object-contain p-1.5"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
              <span className="text-lg font-bold text-brand">
                {job.company?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {job.company}
            </h3>
            {job.location && (
              <p className="text-xs text-text-secondary/70 mt-0.5">
                {job.location}
              </p>
            )}
          </div>
        </div>
      </Section>

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

      <Section label="À propos">
        <p className="text-sm text-text-secondary/70 leading-relaxed">
          Les informations sur cette entreprise seront enrichies
          automatiquement lors de l'analyse IA de l'offre.
        </p>
      </Section>
    </div>
  );
}
