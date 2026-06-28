"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast, type ToastItem } from "@/lib/toast-context";

/* ── Icons ─────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  );
}

/* ── Style map ─────────────────────────────────────── */

const styleMap = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckIcon,
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950/60",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    icon: XIcon,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/60",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-brand dark:text-blue-300",
    icon: InfoIcon,
  },
} as const;

/* ── Single Toast ──────────────────────────────────── */

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const style = styleMap[toast.type];
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${style.bg} ${style.border}`}
    >
      <span className={`shrink-0 ${style.text}`}>
        <Icon />
      </span>
      <p className={`text-sm font-medium ${style.text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`ml-2 shrink-0 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100 ${style.text}`}
        aria-label="Fermer"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

/* ── Toast Container (renders via portal-like fixed positioning) ── */

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2.5">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
