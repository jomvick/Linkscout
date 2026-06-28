"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";

export default function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-xl"
      >
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-left text-sm text-slate-400 dark:text-zinc-500 hover:border-brand/30 hover:shadow-md transition-all duration-200"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1">Trouve-moi un poste Rust remote à plus de 100k...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-border bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-mono text-slate-400 dark:text-zinc-500">
            <span>⌘</span>K
          </kbd>
        </button>

        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl shadow-black/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input autoFocus placeholder="Que cherchez-vous ?" className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none" />
                <kbd className="text-[11px] font-mono text-slate-400 border border-border rounded px-1.5 py-0.5">ESC</kbd>
              </div>
              <div className="p-2 space-y-0.5">
                {[
                  { icon: "💼", label: "Postes Rust remote", desc: "Europe · 100k+" },
                  { icon: "🤖", label: "AI Engineer freelances", desc: "Disponibles maintenant" },
                  { icon: "🏢", label: "Entreprises qui recrutent", desc: "Cette semaine" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-xs text-slate-400 dark:text-zinc-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
