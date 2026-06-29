"use client";

import { useState } from "react";
import { apiAnalyze } from "@/lib/api-client";
import type { Job } from "@/lib/types";
import { Section } from "./detail-panel-helpers";

interface Props {
  job: Job;
  keyword?: string;
}

const SUGGESTED_QUESTIONS = [
  "Cette offre est-elle adaptée à un junior ?",
  "Quelles sont les compétences les plus importantes ?",
  "Quel est le salaire estimé ?",
  "Y a-t-il des mentions de télétravail ?",
];

export default function DetailPanelAssistant({ job, keyword = "" }: Props) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [answering, setAnswering] = useState(false);

  const ask = async (q: string) => {
    if (!q.trim() || answering) return;
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setAnswering(true);
    try {
      const data = await apiAnalyze({
        jobId: job.id,
        job: {
          title: job.title,
          company: job.company,
          description: job.description,
        },
        question: q,
      });
      const answer =
        data.answer ||
        (data.analysis?.summary as string) ||
        "Je n'ai pas pu analyser cette offre pour le moment.";
      setChatHistory((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Une erreur est survenue. Réessayez." },
      ]);
    }
    setAnswering(false);
  };

  return (
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
              onClick={() => ask(q)}
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
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ask(question);
            }
          }}
          placeholder="Que voulez-vous savoir ?"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary/30 outline-none"
        />
        <button
          type="button"
          onClick={() => ask(question)}
          disabled={!question.trim() || answering}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-30 transition-all shrink-0"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
