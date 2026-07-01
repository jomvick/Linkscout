"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export type GatedFeature = "favorites" | "alerts" | "history" | "settings" | "cv" | "credits";

const FEATURE_MESSAGES: Record<GatedFeature, string> = {
  favorites: "Sauvegarder tes offres favorites",
  alerts: "Recevoir des alertes Discord/Telegram",
  history: "Retrouver tes recherches précédentes",
  settings: "Personnaliser ton expérience",
  cv: "Uploader ton CV pour un scoring précis",
  credits: "Tes 5 analyses gratuites sont épuisées. Connecte-toi pour continuer.",
};

export function useGuestGate(isAuthenticated: boolean) {
  const router = useRouter();

  const gate = useCallback(
    (feature: GatedFeature): boolean => {
      if (isAuthenticated) return true;

      sessionStorage.setItem(
        "post_login_redirect",
        `/dashboard?feature=${feature}`,
      );
      router.push(`/login?from=feature_gate&feature=${feature}`);
      return false;
    },
    [isAuthenticated, router],
  );

  return { gate, FEATURE_MESSAGES };
}
