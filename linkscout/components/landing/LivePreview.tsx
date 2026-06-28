"use client";

import { motion } from "framer-motion";

const TOP_COMPANIES = [
  { name: "Polygon", color: "#8247E5" },
  { name: "Datadog", color: "#632CA6" },
  { name: "Cloudflare", color: "#F38020" },
];

export default function LivePreview({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
      animate={visible ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -8, scaleY: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="origin-top overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl shadow-slate-900/5 dark:shadow-black/30">
        <div className="px-6 py-4 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">24 résultats disponibles</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-zinc-500">Top entreprises</span>
        </div>
        <div className="px-6 py-4 flex items-center gap-3">
          {TOP_COMPANIES.map((c) => (
            <div key={c.name} className="flex items-center gap-2 rounded-xl border border-border bg-white dark:bg-surface px-3.5 py-2">
              <div className="h-5 w-5 rounded-md" style={{ background: c.color }} />
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
