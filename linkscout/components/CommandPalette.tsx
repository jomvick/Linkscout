"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Action {
  id: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAction: (actionId: string) => void;
  onSearch: (q: string) => void;
}

const ACTIONS: Action[] = [
  {
    id: "search",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    label: "Nouvelle recherche",
    desc: "Lancer une nouvelle recherche d'opportunités",
  },
  {
    id: "favorites",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    label: "Favoris",
    desc: "Consulter ses offres sauvegardées",
  },
  {
    id: "alerts",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    label: "Créer une alerte",
    desc: "Être notifié des nouvelles offres",
  },
  {
    id: "history",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "Historique",
    desc: "Consulter les recherches précédentes",
  },
  {
    id: "cv",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    label: "Analyser un CV",
    desc: "Paramètres et matching CV",
  },
];

export default function CommandPalette({
  open,
  onClose,
  onAction,
  onSearch,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim()) {
          onClose();
          onSearch(query.trim());
        } else if (filtered[selectedIndex]) {
          onClose();
          onAction(filtered[selectedIndex].id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, query, selectedIndex, onClose, onSearch, onAction]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const filtered = useMemo(
    () =>
      ACTIONS.filter(
        (a) =>
          !query ||
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.desc.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 sm:pt-[12vh] px-3 sm:px-0 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/20"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Palette de commandes"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
              <svg
                className="w-4 h-4 text-text-secondary/40 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Que voulez-vous faire ?"
                aria-label="Rechercher une action"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary/30 outline-none"
              />
              <kbd className="text-[10px] font-mono text-text-secondary/30 border border-border rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <div
              ref={listRef}
              className="max-h-75 overflow-y-auto p-1.5"
              role="listbox"
              aria-label="Actions disponibles"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-text-secondary/50">
                    Aucun résultat pour &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={i === selectedIndex}
                      onClick={() => {
                        onClose();
                        if (query.trim()) {
                          onSearch(query.trim());
                        } else {
                          onAction(item.id);
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-75 ${
                        i === selectedIndex
                          ? "bg-brand/10 text-brand"
                          : "text-text-secondary hover:bg-canvas/80 hover:text-text-primary"
                      }`}
                    >
                      <span
                        className={`shrink-0 ${i === selectedIndex ? "text-brand" : "text-text-secondary/50"}`}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.label}
                        </div>
                        <div className="text-xs text-text-secondary/50 truncate">
                          {item.desc}
                        </div>
                      </div>
                      {i === selectedIndex && (
                        <kbd className="text-[10px] font-mono text-brand/60 border border-brand/20 rounded px-1.5 py-0.5">
                          ↵
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
