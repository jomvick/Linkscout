"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  compact?: boolean;
}

export default function CommandBar({ value, onChange, onFocus, compact }: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [shortcutHint, setShortcutHint] = useState("Ctrl+K");

  useEffect(() => {
    setShortcutHint(
      navigator.platform.includes("Mac") ? "⌘K" : "Ctrl+K",
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <motion.div
        animate={
          compact
            ? {}
            : {
                scale: focused ? 1.02 : 1,
                borderColor: focused ? "rgb(10, 102, 194)" : "rgb(226, 232, 240)",
              }
        }
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`flex items-center gap-3 rounded-2xl border bg-surface shadow-sm transition-shadow duration-200 focus-within:shadow-md ${
          compact ? "px-4 py-2" : "px-5 py-3.5"
        }`}
      >
        <svg className="h-5 w-5 shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => setFocused(false)}
          placeholder="Rechercher un rôle, une techno ou un lieu..."
          className={`min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-secondary/60 ${
            compact ? "text-sm" : "text-[15px]"
          }`}
          aria-label="Rechercher une opportunité"
        />

        <AnimatePresence mode="wait">
          {!focused && !value && (
            <motion.kbd
              key="shortcut"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="shrink-0 rounded-md border border-border bg-canvas px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary"
            >
              {shortcutHint}
            </motion.kbd>
          )}
        </AnimatePresence>

        {value && (
          <button
            onClick={() => onChange("")}
            className="shrink-0 rounded-full p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
            aria-label="Effacer la recherche"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </motion.div>
    </div>
  );
}
