"use client";

interface SkillBadgeProps {
  name: string;
  importance?: number;
  compact?: boolean;
}

export default function SkillBadge({ name, importance, compact = false }: SkillBadgeProps) {
  const level =
    importance != null
      ? importance >= 80
        ? "Essentiel"
        : importance >= 50
          ? "Important"
          : "Souhaité"
      : null;

  if (compact) {
    return (
      <span className="inline-flex items-center rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary/80 border border-border/40">
        {name}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand/60" />
        <span className="text-sm font-medium text-text-primary">{name}</span>
      </div>
      {level && (
        <span className="text-[11px] font-medium text-text-secondary/60">{level}</span>
      )}
    </div>
  );
}

export function SkillBar({ name, importance }: { name: string; importance: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">{name}</span>
        <span className="font-mono text-text-secondary/50 text-[10px]">
          {importance >= 80 ? "Essentiel" : importance >= 50 ? "Important" : "Souhaité"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-canvas overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all duration-700 ease-out"
          style={{ width: `${Math.max(importance, 10)}%` }}
        />
      </div>
    </div>
  );
}
