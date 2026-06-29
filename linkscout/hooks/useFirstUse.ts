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

  return {
    showWizard,
    setShowWizard,
    completeOnboarding,
    hasDoneFirstSearch,
    onFirstSearch,
  };
}
