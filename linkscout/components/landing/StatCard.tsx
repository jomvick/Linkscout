"use client";

import AnimatedNumber from "./AnimatedNumber";

export default function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        <AnimatedNumber value={value} />
        <span className="text-brand">{suffix}</span>
      </div>
      <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
