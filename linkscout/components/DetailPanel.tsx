"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Job } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import MatchScore from "./MatchScore";
import DetailPanelOverview from "./DetailPanelOverview";
import DetailPanelSkills from "./DetailPanelSkills";
import DetailPanelCompany from "./DetailPanelCompany";
import DetailPanelAssistant from "./DetailPanelAssistant";
import { LogoDisplay } from "./detail-panel-helpers";

type Tab = "overview" | "skills" | "company" | "assistant";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "skills", label: "Skills" },
  { key: "company", label: "Company" },
  { key: "assistant", label: "Assistant" },
];

interface Props {
  job: Job;
  analyzing: boolean;
  onAnalyze: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose?: () => void;
  keyword?: string;
}

export default function DetailPanel({
  job,
  analyzing,
  onAnalyze,
  isFavorite,
  onToggleFavorite,
  onClose,
  keyword = "",
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    setTab("overview");
  }, [job.id]);

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="shrink-0 p-5 pb-3 border-b border-border/40">
        <div className="flex items-start gap-3.5 mb-4">
          <LogoDisplay
            domain={job.company?.toLowerCase().replace(/[^a-z0-9]/g, "") || ""}
            name={job.company}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-text-primary leading-snug truncate">
                  {job.title}
                </h2>
                <p className="text-sm text-text-secondary/70 mt-0.5 truncate">
                  {job.company}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary/40 hover:text-text-secondary hover:bg-canvas transition-all"
                    aria-label="Fermer le panneau"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <FavoriteButton
                  isFavorite={isFavorite}
                  onToggle={onToggleFavorite}
                  variant="panel"
                />
                <MatchScore score={job.match_score} size="md" />
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex gap-1 rounded-lg bg-canvas p-0.5"
          role="tablist"
          aria-label="Sections du détail de l'offre"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`job-tab-${t.key}`}
              aria-controls={`job-panel-${t.key}`}
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                tab === t.key
                  ? "bg-surface text-text-primary shadow-sm border border-border/50"
                  : "text-text-secondary/60 hover:text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="p-5 space-y-6"
            role="tabpanel"
            id={`job-panel-${tab}`}
            aria-labelledby={`job-tab-${tab}`}
          >
            {tab === "overview" && (
              <DetailPanelOverview
                job={job}
                analyzing={analyzing}
                onAnalyze={onAnalyze}
              />
            )}
            {tab === "skills" && (
              <DetailPanelSkills
                job={job}
                analyzing={analyzing}
                onAnalyze={onAnalyze}
              />
            )}
            {tab === "company" && (
              <DetailPanelCompany job={job} />
            )}
            {tab === "assistant" && (
              <DetailPanelAssistant job={job} keyword={keyword} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
