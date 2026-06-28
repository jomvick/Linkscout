"use client";

import { useState } from "react";

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const containerSizes: Record<string, string> = {
  sm: "h-7 w-7 text-[9px] rounded-lg",
  md: "h-9 w-9 text-[10px] rounded-xl",
  lg: "h-10 w-10 text-xs rounded-xl",
};

/** Même logique que company_slug() dans enrich.py. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /,?\s*(inc\.?|incorp|llc|ltd\.?|limited|corp\.?|corporation|gmbh|ag|sa|sas|sarl|plc|llp|co\.?|company|group|holdings?|technologies|solutions)\s*\.?\s*$/i,
      "",
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Chaîne de sources logo (tentées dans l'ordre) :
 *
 * 1. logo_url persistée par le scraper (URL unavatar .com pré-calculée)
 * 2. unavatar .io  — startups tech (GitLab, Vercel, etc.)
 * 3. unavatar .ai  — startups IA
 * 4. unavatar .co  — SaaS divers
 * 5. Initiales     — fallback final garanti
 *
 * unavatar.io agrège : Twitter, GitHub, DuckDuckGo, Clearbit (s'il revient),
 * et le favicon du site. Avec ?fallback=false il renvoie 404 si introuvable
 * → onError se déclenche et on passe à la source suivante.
 */
function buildSources(companyName: string, logoUrl?: string | null): string[] {
  const slug = slugify(companyName);
  const sources: string[] = [];

  if (logoUrl) sources.push(logoUrl);

  if (slug) {
    for (const tld of ["com", "io", "ai", "co"]) {
      const url = `https://unavatar.io/${slug}.${tld}?fallback=false`;
      // Déduplique si logo_url est déjà la même URL
      if (!sources.includes(url)) sources.push(url);
    }
  }

  return sources;
}

function Initials({ name, sizeClass }: { name: string; sizeClass: string }) {
  const letters = name?.slice(0, 2).toUpperCase() || "??";
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-linear-to-br from-brand/10 to-brand/5 font-semibold text-brand border border-brand/10 shadow-inner ${sizeClass}`}
    >
      {letters}
    </div>
  );
}

export default function CompanyLogo({
  companyName,
  logoUrl,
  size = "md",
}: CompanyLogoProps) {
  const sources = buildSources(companyName, logoUrl);
  const [srcIndex, setSrcIndex] = useState(0);
  const sizeClass = containerSizes[size];

  if (srcIndex >= sources.length || !companyName) {
    return <Initials name={companyName} sizeClass={sizeClass} />;
  }

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center bg-white dark:bg-zinc-800 p-1 border border-slate-200/60 dark:border-zinc-700 shadow-sm overflow-hidden ${sizeClass}`}
    >
      <img
        key={sources[srcIndex]}
        src={sources[srcIndex]}
        alt={`${companyName} logo`}
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
        onError={() => setSrcIndex((i) => i + 1)}
      />
    </div>
  );
}
