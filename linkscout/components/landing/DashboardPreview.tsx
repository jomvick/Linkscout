"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import CompanyLogo from "@/components/CompanyLogo";

interface JobDemo {
  id: number;
  title: string;
  company: string;
  score: number;
  tags: string[];
}

const DEMO_JOBS: JobDemo[] = [
  { id: 1, title: "Senior Rust Engineer", company: "Polygon", score: 94, tags: ["Rust", "Kubernetes", "Distributed Systems"] },
  { id: 2, title: "AI/ML Engineer", company: "Datadog", score: 88, tags: ["Python", "PyTorch", "MLOps"] },
  { id: 3, title: "Staff Frontend Engineer", company: "Cloudflare", score: 82, tags: ["React", "TypeScript", "WebAssembly"] },
  { id: 4, title: "Protocol Engineer", company: "Ethereum Foundation", score: 79, tags: ["Go", "Cryptography", "P2P"] },
];

const summaries: Record<number, string> = {
  1: "Poste de haute exigence ciblant l'infrastructure distribuée chez Polygon. Stack Rust + K8s parfaitement alignée avec ton expérience en systèmes bas niveau.",
  2: "Opportunité de pointe en IA/ML chez Datadog. Forte composante MLOps et PyTorch, idéale pour un profil avec background data engineering.",
  3: "Poste orienté performance web chez Cloudflare. Stack moderne React/TypeScript avec une composante WebAssembly — stack de prédilection.",
  4: "Projet protocolaire ambitieux à l'Ethereum Foundation. Go et cryptographie natives, travail sur la couche consensus du réseau.",
};

export default function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [activeId, setActiveId] = useState(DEMO_JOBS[0].id);

  const active = DEMO_JOBS.find((j) => j.id === activeId)!;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto max-w-5xl rounded-2xl border border-border bg-surface shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60 bg-canvas/50">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-amber-400" />
        <div className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ml-4 flex h-6 max-w-50 flex-1 items-center rounded-lg bg-slate-200 px-3 dark:bg-zinc-700">
          <span className="text-xs text-slate-400 dark:text-zinc-500">dashboard.linkscout.app</span>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid min-h-[420px] grid-cols-[160px_1fr_260px]">
        {/* Sidebar nav */}
        <div className="border-r border-border/60 p-4 space-y-1.5 bg-canvas/30">
          {["Recherche", "Favoris", "Alertes", "Paramètres"].map((item) => (
            <div
              key={item}
              className={`rounded-xl px-3.5 py-2.5 text-sm transition-colors cursor-default ${
                item === "Recherche"
                  ? "bg-brand/10 text-brand font-semibold"
                  : "text-slate-500 dark:text-zinc-400 hover:bg-brand/10 hover:text-brand"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Job list */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[420px]">
          {DEMO_JOBS.map((job) => (
            <motion.button
              key={job.id}
              onClick={() => setActiveId(job.id)}
              layout
              className={`flex items-center gap-3 w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                activeId === job.id
                  ? "border-brand bg-brand/5 shadow-sm"
                  : "border-border/60 bg-white dark:bg-surface hover:border-slate-300 dark:hover:border-zinc-600"
              }`}
            >
              <CompanyLogo companyName={job.company} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {job.title}
                  </span>
                  <span className="shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {job.score}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{job.company}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="border-l border-border/60 p-5 bg-canvas/30 space-y-4">
          <div className="flex items-center gap-2">
            <CompanyLogo companyName={active.company} size="sm" />
            <span className="text-xs font-bold tracking-wider font-mono bg-brand/10 text-brand px-2 py-0.5 rounded-md uppercase">
              Match IA
            </span>
          </div>

          <div>
            <p className="text-xs text-slate-400 dark:text-zinc-500">Poste</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{active.title}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 dark:text-zinc-500">Entreprise</p>
            <p className="text-sm text-slate-700 dark:text-zinc-300">{active.company}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {active.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-slate-500 dark:text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="pt-2 border-t border-border/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono uppercase tracking-wider mb-2">
              Résumé opportunité
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed bg-white dark:bg-surface p-3 rounded-xl border border-border/60 shadow-inner">
              {summaries[active.id]}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
