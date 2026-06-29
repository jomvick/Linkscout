"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiAnalyze } from "@/lib/api-client";
import type { Job } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import MatchScore from "./MatchScore";
import ExhaustiveScoreView from "./ExhaustiveScoreView";
import { SkillBar } from "./SkillBadge";

type Tab = "overview" | "skills" | "company" | "assistant";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Aperçu" },
  { key: "skills", label: "Compétences" },
  { key: "company", label: "Entreprise" },
  { key: "assistant", label: "Assistant" },
];

function LogoDisplay({ job }: { job: Job }) {
  const [failed, setFailed] = useState(false);
  const domain = job.company?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  const src = job.logo_url || `https://logo.clearbit.com/${domain}.com`;

  if (!failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-border/60 shadow-sm">
        <img
          src={src}
          alt={`Logo de ${job.company}`}
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
      <span className="text-lg font-bold text-brand">
        {job.company?.charAt(0)?.toUpperCase() || "?"}
      </span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} jours`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-text-secondary/60">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right">
        {value}
      </span>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/40">
        {label}
      </h4>
      {children}
    </div>
  );
}

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
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    setTab("overview");
    setAssistantQuestion("");
    setChatHistory([]);
    setAnswering(false);
  }, [job.id]);

  const requestAssistantAnswer = async (question: string, fallback: string) => {
    const data = await apiAnalyze({ jobId: job.id, job, question });
    return data.answer || (data.analysis?.summary as string) || fallback;
  };

  const askAssistant = async () => {
    if (!assistantQuestion.trim()) return;
    const q = assistantQuestion.trim();
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setAssistantQuestion("");
    setAnswering(true);
    try {
      const answer = await requestAssistantAnswer(
        q,
        "Je n'ai pas pu analyser cette offre pour le moment.",
      );
      setChatHistory((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Une erreur est survenue. Réessayez." },
      ]);
    }
    setAnswering(false);
  };

  const SUGGESTED_QUESTIONS = [
    "Cette offre est-elle adaptée à un junior ?",
    "Quelles sont les compétences les plus importantes ?",
    "Quel est le salaire estimé ?",
    "Y a-t-il des mentions de télétravail ?",
  ];

  const handleSuggested = async (q: string) => {
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setAnswering(true);
    try {
      const answer = await requestAssistantAnswer(
        q,
        "Je n'ai pas pu analyser cette offre pour le moment.",
      );
      setChatHistory((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Une erreur est survenue." },
      ]);
    }
    setAnswering(false);
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="shrink-0 p-5 pb-3 border-b border-border/40">
        <div className="flex items-start gap-3.5 mb-4">
          <LogoDisplay job={job} />
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
              <>
                <div className="rounded-xl border border-border/40 bg-canvas/50 p-4 space-y-0">
                  {job.location && (
                    <DetailRow label="Localisation" value={job.location} />
                  )}
                  {job.salary && (
                    <DetailRow label="Salaire" value={job.salary} />
                  )}
                  {job.contract_type && (
                    <DetailRow label="Contrat" value={job.contract_type} />
                  )}
                  {job.created_at && (
                    <DetailRow
                      label="Publiée"
                      value={timeAgo(job.created_at)}
                    />
                  )}
                  {job.source && (
                    <DetailRow label="Source" value={job.source.includes('linkedin') ? 'LinkedIn' : job.source} />
                  )}
                </div>

                {job.match_score != null && job.score_breakdown && (
                  <ExhaustiveScoreView
                    breakdown={job.score_breakdown}
                    matchScore={job.match_score}
                    verdictAi={job.verdict_ai}
                  />
                )}
                {job.match_score != null && !job.score_breakdown && (
                  <Section label="Score de compatibilité">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            job.match_score >= 90
                              ? "bg-linear-to-r from-emerald-500 to-emerald-400"
                              : job.match_score >= 70
                                ? "bg-linear-to-r from-amber-500 to-amber-400"
                                : "bg-linear-to-r from-blue-500 to-blue-400"
                          }`}
                          style={{ width: `${job.match_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-text-primary font-mono tabular-nums">
                        {job.match_score}%
                      </span>
                    </div>
                  </Section>
                )}

                <Section label="Résumé IA">
                  {analyzing && !job.summary ? (
                    <div className="flex items-center gap-2 text-sm text-text-secondary py-2">
                      <span className="h-3.5 w-3.5 border-2 border-border border-t-brand rounded-full animate-spin" />
                      Analyse en cours...
                    </div>
                  ) : job.summary ? (
                    <div className="rounded-xl border border-brand/10 bg-brand/3 p-4">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 mt-0.5 shrink-0 text-brand"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                          />
                        </svg>
                        <p className="text-sm text-text-primary leading-relaxed">
                          {job.summary}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-text-secondary">
                      <button
                        type="button"
                        onClick={onAnalyze}
                        className="text-brand hover:underline font-medium inline"
                      >
                        Analyser avec l'IA
                      </button>
                      <span> pour générer un résumé</span>
                    </div>
                  )}
                </Section>

                {job.description && (
                  <details className="group rounded-xl border border-border/40 bg-canvas/50">
                    <summary className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors [&::-webkit-details-marker]:hidden">
                      <svg
                        className="h-3.5 w-3.5 transition-transform group-open:rotate-90 text-text-secondary/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      Description originale
                    </summary>
                    <div className="px-4 pb-4 border-t border-border/30 pt-3">
                      <p className="text-xs text-text-secondary/70 leading-relaxed whitespace-pre-line">
                        {job.description.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>
                  </details>
                )}

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover font-medium"
                  >
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Voir l'offre originale
                  </a>
                )}
              </>
            )}

            {tab === "skills" && (
              <Section label="Technologies & compétences">
                {job.tech_stack && job.tech_stack.length > 0 ? (
                  <div className="space-y-2">
                    {job.tech_stack.map((tech, i) => {
                      const importance = Math.max(20, 100 - i * 12);
                      return (
                        <SkillBar
                          key={tech}
                          name={tech}
                          importance={importance}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-text-secondary text-center py-8">
                    {analyzing ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin" />
                        Extraction en cours...
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onAnalyze}
                          className="text-brand hover:underline font-medium"
                        >
                          Analyser
                        </button>
                        <span> pour extraire la stack technique</span>
                      </>
                    )}
                  </div>
                )}
              </Section>
            )}

            {tab === "company" && (
              <div className="space-y-5">
                <Section label="Entreprise">
                  <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-canvas/50 p-4">
                    <LogoDisplay job={job} />
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {job.company}
                      </h3>
                      {job.location && (
                        <p className="text-xs text-text-secondary/70 mt-0.5">
                          {job.location}
                        </p>
                      )}
                    </div>
                  </div>
                </Section>

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover font-medium"
                  >
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Voir l'offre originale
                  </a>
                )}

                <Section label="À propos">
                  <p className="text-sm text-text-secondary/70 leading-relaxed">
                    Les informations sur cette entreprise seront enrichies
                    automatiquement lors de l'analyse IA de l'offre.
                  </p>
                </Section>
              </div>
            )}

            {tab === "assistant" && (
              <div className="flex h-full min-h-80 flex-col">
                <Section label="Assistant IA">
                  <p className="text-xs text-text-secondary/60 mb-3">
                    Posez une question sur cette offre. L'IA analysera la
                    description pour vous répondre.
                  </p>
                </Section>

                <div className="mb-4 max-h-55 flex-1 space-y-3 overflow-y-auto">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-brand text-white"
                            : "bg-canvas text-text-primary border border-border/40"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {answering && (
                    <div className="flex justify-start">
                      <div className="rounded-xl bg-canvas border border-border/40 px-3.5 py-2.5">
                        <span className="flex items-center gap-1 text-sm text-text-secondary">
                          <span
                            className="h-1.5 w-1.5 bg-brand rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 bg-brand rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 bg-brand rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {chatHistory.length === 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSuggested(q)}
                        className="rounded-lg border border-border/50 bg-canvas/50 px-3 py-1.5 text-[11px] text-text-secondary/70 hover:border-brand/30 hover:text-brand transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-canvas/80 px-3.5 py-2.5 transition-all focus-within:border-brand/40 focus-within:shadow-sm focus-within:shadow-brand/5">
                  <input
                    type="text"
                    value={assistantQuestion}
                    onChange={(e) => setAssistantQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        askAssistant();
                      }
                    }}
                    placeholder="Que voulez-vous savoir ?"
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary/30 outline-none"
                  />
                  <button
                    type="button"
                    onClick={askAssistant}
                    disabled={!assistantQuestion.trim() || answering}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-30 transition-all shrink-0"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
