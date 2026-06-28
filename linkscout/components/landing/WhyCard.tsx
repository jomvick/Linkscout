"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function WhyCard({ icon, title, desc, index }: { icon: React.ReactNode; title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl border border-border bg-surface p-8 hover:border-brand/20 hover:shadow-lg hover:shadow-brand/5 transition-all duration-500"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
