"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    title: "Bienvenue sur LinkScout",
    subtitle: "Votre assistant de recherche d'emploi intelligent",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.58 5.58 0 006.25 10.5a5.58 5.58 0 012.038-3.712" />
      </svg>
    ),
    description:
      "LinkScout scrappe LinkedIn, analyse chaque offre avec l'IA, et vous donne un score de match, un résumé, et une estimation salariale — le tout dans un dashboard zen.",
  },
  {
    title: "Recherche intelligente",
    subtitle: "Un mot-clé suffit",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    description:
      "Tapez un rôle, une techno, ou un lieu dans la barre de recherche. L'IA analyse chaque offre instantanément : stack technique, salaire, type de contrat, et score de compatibilité.",
  },
  {
    title: "Analyse IA instantanée",
    subtitle: "Pas de configuration requise",
    icon: (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    description:
      "Dès que vous sélectionnez une offre, l'IA génère un résumé, extrait la stack technique, estime le salaire, et vous donne un verdict contextuel. Aucune clé API à configurer.",
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export default function FirstUseWizard({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-2xl"
      >
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-brand" : "bg-border/50"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="px-6 py-6"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              {current.icon}
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              {current.title}
            </h2>
            <p className="mt-1 text-xs font-medium text-text-secondary/70 uppercase tracking-wider">
              {current.subtitle}
            </p>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-text-secondary/60 hover:text-text-secondary transition-colors"
          >
            Passer
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
          >
            {isLast ? "Commencer" : "Suivant"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
