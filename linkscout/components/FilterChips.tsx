"use client";

import { motion } from "framer-motion";

export interface Chip {
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: Chip[];
  active: string;
  onChange: (id: string) => void;
}

export default function FilterChips({ chips, active, onChange }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((chip) => {
        const isActive = active === chip.id;
        return (
          <motion.button
            key={chip.id}
            onClick={() => onChange(chip.id)}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`relative rounded-lg border px-3 py-1 text-xs font-medium transition-all duration-150 ${
              isActive
                ? "border-brand/50 bg-brand/10 text-brand shadow-sm"
                : "border-border/60 text-text-secondary/60 hover:border-border hover:text-text-secondary"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="chip-indicator"
                className="absolute inset-0 rounded-lg bg-brand/5"
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              />
            )}
            <span className="relative">{chip.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
