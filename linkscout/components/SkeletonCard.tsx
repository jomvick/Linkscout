"use client";

import { motion } from "framer-motion";

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-md ${className ?? ""}`}
      style={{
        background:
          "linear-gradient(90deg, var(--c-border) 25%, var(--c-surface) 50%, var(--c-border) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s ease-in-out infinite",
      }}
    />
  );
}

export default function SkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 30 }}
      className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      aria-hidden="true"
    >
      <div className="flex items-start gap-4">
        {/* Avatar circle */}
        <ShimmerBlock className="h-11 w-11 shrink-0 !rounded-full" />

        <div className="min-w-0 flex-1 space-y-3">
          {/* Title + score row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              {/* Title line */}
              <ShimmerBlock className="h-4 w-3/4" />
              {/* Subtitle line */}
              <ShimmerBlock className="h-3.5 w-1/2" />
            </div>
            {/* Score circle placeholder */}
            <ShimmerBlock className="h-12 w-12 shrink-0 !rounded-full" />
          </div>

          {/* Badge row */}
          <div className="flex items-center gap-1.5">
            <ShimmerBlock className="h-5 w-14 !rounded-md" />
            <ShimmerBlock className="h-5 w-16 !rounded-md" />
            <ShimmerBlock className="h-5 w-12 !rounded-md" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
