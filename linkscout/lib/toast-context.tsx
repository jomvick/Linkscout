"use client";

import { createContext, useContext, useCallback, useState, type ReactNode } from "react";

/* ── Types ─────────────────────────────────────────── */

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

/* ── Context ───────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
let counter = 0;

/* ── Provider ──────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++counter}-${Date.now()}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      // Keep only the latest MAX_VISIBLE toasts (FIFO)
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────── */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
