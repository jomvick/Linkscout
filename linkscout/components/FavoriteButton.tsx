"use client";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  variant?: "card" | "panel";
}

const VARIANT_STYLES = {
  card: {
    size: "h-6 w-6 rounded-md",
    active:
      "border-amber-200/60 bg-amber-50/80 text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10",
    inactive:
      "border-transparent text-text-secondary/20 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:border-amber-200/60 hover:bg-amber-50/80 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/10",
    icon: "h-3 w-3",
  },
  panel: {
    size: "h-7 w-7 rounded-lg",
    active:
      "border-amber-200/60 bg-amber-50/80 text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10",
    inactive:
      "border-border/50 text-text-secondary/30 hover:text-amber-400 hover:border-amber-200/60 hover:bg-amber-50/80 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/10",
    icon: "h-3.5 w-3.5",
  },
} as const;

export default function FavoriteButton({
  isFavorite,
  onToggle,
  variant = "card",
}: FavoriteButtonProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`flex items-center justify-center border transition-all duration-150 ${styles.size} ${
        isFavorite ? styles.active : styles.inactive
      }`}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={isFavorite}
    >
      <svg
        className={styles.icon}
        fill={isFavorite ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
}
