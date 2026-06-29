"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function TimelineStep({
  icon,
  title,
  desc,
  index,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  index: number;
  isLast?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -24 : 24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-5 pb-12 last:pb-0"
    >
      <div className="relative flex flex-col items-center">
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20 ring-4 ring-canvas">
          {icon}
        </div>
      </div>
      <div className="pt-2.5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}
