"use client";

import { motion } from "framer-motion";

export type StepStatus = "idle" | "loading" | "success";

export interface StatusStep {
  id: string;
  label: string;
  status: StepStatus;
}

interface SearchStatusLogsProps {
  steps: StatusStep[];
}

const container = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const },
  },
};

export default function SearchStatusLogs({ steps }: SearchStatusLogsProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="w-full max-w-xl mx-auto rounded-2xl border border-border/60 bg-surface/90 backdrop-blur-xl p-4 shadow-xl shadow-slate-900/5 dark:shadow-black/30"
    >
      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                {step.status === "loading" && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                )}

                {step.status === "success" && (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-800"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}

                {step.status === "idle" && (
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-zinc-600" />
                )}
              </div>

              <span
                className={`truncate font-medium tracking-tight transition-colors duration-200 ${
                  step.status === "loading"
                    ? "text-slate-900 dark:text-white font-semibold"
                    : step.status === "success"
                      ? "text-slate-500 dark:text-zinc-400"
                      : "text-slate-300 dark:text-zinc-600"
                }`}
              >
                {step.label}
              </span>
            </div>

            {step.status === "loading" && (
              <span className="shrink-0 text-[10px] font-mono text-brand bg-brand/10 dark:bg-brand/15 px-2 py-0.5 rounded-md animate-pulse">
                Traitement...
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
