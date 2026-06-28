"use client";

import { useState, useEffect, useCallback } from "react";
import type { Job } from "@/lib/types";

const STORAGE_KEY = "linkscout_first_use_done";

export function useFirstUse() {
  const [showWizard, setShowWizard] = useState(false);
  const [hasDoneFirstSearch, setHasDoneFirstSearch] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setShowWizard(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowWizard(false);
  }, []);

  const onFirstSearch = useCallback(() => {
    setHasDoneFirstSearch(true);
    completeOnboarding();
  }, [completeOnboarding]);

  const wizardJob: Job = {
    id: "demo-guidance",
    title: "Développeur·se React / TypeScript",
    company: "LinkScout",
    description:
      "Rejoignez LinkScout pour construire la prochaine génération d'outils de recherche d'emploi intelligents. Stack : React 19, TypeScript, Next.js 15, Tailwind CSS, Supabase. Missions : architecture des composants, optimisation des performances, intégration d'APIs LLM.",
    url: null,
    source: "demo",
    status: "new",
    created_at: new Date().toISOString(),
    logo_url: null,
    match_score: null,
    summary: null,
    tech_stack: null,
    salary: null,
    location: "Paris / Remote",
    contract_type: null,
    pitch: null,
    score_breakdown: null,
    verdict_ai: null,
  };

  return {
    showWizard,
    setShowWizard,
    completeOnboarding,
    hasDoneFirstSearch,
    onFirstSearch,
    wizardJob,
  };
}
