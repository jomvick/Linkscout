"use client";

import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl border border-border bg-surface overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-brand/5 via-transparent to-indigo-500/5" />
        <div className="relative px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
            Prêt à explorer les meilleures opportunités ?
          </h2>
          <p className="text-sm text-slate-400 dark:text-zinc-500 mb-8 max-w-md mx-auto">
            Rejoignez les profils tech qui utilisent LinkScout pour trouver
            leur prochain défi.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 active:scale-[0.97]"
          >
            Commencer la recherche
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
        </div>
      </motion.div>
    </section>
  );
}
