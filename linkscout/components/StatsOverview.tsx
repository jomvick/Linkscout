"use client";

import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

export default function StatsOverview() {
  const { stats, jobs } = useDashboard();
  const currentCount = jobs.length;
  const uniqueCompanies = stats.uniqueCompanies;
  const avgMatchScore = stats.avgMatchScore;
  const analyzedCount = stats.analyzedCount;

  const contractCounts: Record<string, number> = { "CDI": 0, "Freelance": 0, "CDD": 0, "Alternance": 0 };
  jobs.forEach(j => {
    if (j.contract_type) {
      const type = j.contract_type.toUpperCase();
      if (type.includes("CDI")) contractCounts["CDI"]++;
      else if (type.includes("FREE") || type.includes("INDEP")) contractCounts["Freelance"]++;
      else if (type.includes("CDD")) contractCounts["CDD"]++;
      else if (type.includes("ALT") || type.includes("STAGE") || type.includes("APPREN")) contractCounts["Alternance"]++;
    }
  });

  const totalContracts = Object.values(contractCounts).reduce((a, b) => a + b, 0);
  const hasContractData = totalContracts > 0;
  const maxContractVal = Math.max(...Object.values(contractCounts), 1);

  const techCounts: Record<string, number> = {};
  jobs.forEach(j => { if (j.tech_stack) j.tech_stack.forEach(t => { const c = t.trim(); if (c) techCounts[c] = (techCounts[c] || 0) + 1; }); });
  const displayTechs = Object.entries(techCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const hasTechData = displayTechs.length > 0;
  const maxDisplayTechVal = hasTechData ? Math.max(...displayTechs.map(t => t[1] as number), 1) : 1;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 select-none">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-primary tracking-tight">
          Aperçu
        </h2>
        <p className="text-xs text-text-secondary/60">
          Métriques globales de votre recherche d'opportunités.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Offres Indexées", value: stats.totalJobs.toLocaleString("fr"), sub: `${currentCount} offres chargées`, color: "bg-brand/10 text-brand" },
          { label: "Entreprises", value: uniqueCompanies.toLocaleString("fr"), sub: "Diversité de sources", color: "bg-accent/10 text-accent" },
          ...(avgMatchScore != null ? [{ label: "Score Moyen", value: `${avgMatchScore}%`, sub: "Compatibilité IA", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }] : []),
          { label: "Enrichies IA", value: String(analyzedCount), sub: "Offres analysées", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
        ].filter(Boolean).map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="rounded-xl border border-border/60 bg-surface p-4"
          >
            <p className={`text-[10px] font-semibold tracking-wider uppercase ${stat.color}`}>{stat.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-text-primary tracking-tight">{stat.value}</p>
            <p className="mt-1 text-[10px] text-text-secondary/50">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {hasTechData && <div className="rounded-xl border border-border/60 bg-surface p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Technologies les plus demandées</h3>
            <p className="text-[10px] text-text-secondary/50 mt-0.5">Extraction automatique par l'IA.</p>
          </div>
          <div className="space-y-3">
            {displayTechs.map(([tech, count], i) => {
              const percentage = Math.round(((count as number) / maxDisplayTechVal) * 100);
              return (
                <div key={tech as string} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-brand" />
                      {tech as string}
                    </span>
                    <span className="font-mono text-text-secondary/50 text-[10px]">{count as number} offre{(count as number) !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-canvas overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {hasContractData && <div className="rounded-xl border border-border/60 bg-surface p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Répartition des Contrats</h3>
            <p className="text-[10px] text-text-secondary/50 mt-0.5">Types de postes identifiés.</p>
          </div>
          <div className="space-y-3">
            {Object.entries(contractCounts).map(([type, count], i) => {
              const percentage = Math.round((count as number) / maxContractVal * 100);
              const colors = ["from-emerald-500 to-teal-600", "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600", "from-amber-500 to-orange-600"];
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full bg-gradient-to-r ${colors[i]}`} />
                      {type}
                    </span>
                    <span className="font-mono text-text-secondary/50 text-[10px]">{count as number} poste{(count as number) !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-canvas overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${colors[i]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
      </div>
    </div>
  );
}
