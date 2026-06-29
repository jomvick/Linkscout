"use client";

import type { ReactNode } from "react";

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function calcSkillImportance(index: number): number {
  return Math.max(20, 100 - index * 12);
}

export function LogoDisplay({ domain, name }: { domain: string; name: string }) {
  const src = `https://logo.clearbit.com/${domain}.com`;
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-border/60 shadow-sm">
      <img
        src={src}
        alt={`${name} logo`}
        className="h-full w-full object-contain p-1.5"
        onError={(e) => {
          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
          e.currentTarget.style.display = "none";
        }}
      />
      <div
        className="hidden h-12 w-12 items-center justify-center rounded-xl bg-brand/10 border border-brand/20"
        aria-hidden
      >
        <span className="text-lg font-bold text-brand">
          {name?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-text-secondary/60">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right">
        {value}
      </span>
    </div>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/40">
        {label}
      </h4>
      {children}
    </div>
  );
}
