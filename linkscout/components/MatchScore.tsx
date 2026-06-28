"use client";

interface MatchScoreProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export default function MatchScore({ score, size = "sm", showIcon = true }: MatchScoreProps) {
  if (score === null) return null;

  const colorClass =
    score >= 90
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-text-secondary bg-canvas border-border/60";

  const sizeClass = size === "lg" ? "px-3 py-1 text-sm" : size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border font-bold ${colorClass} ${sizeClass}`}>
      <span>{score}%</span>
      {showIcon && (
        <svg className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
      )}
    </span>
  );
}
