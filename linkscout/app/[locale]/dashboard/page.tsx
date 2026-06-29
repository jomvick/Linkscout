import { Suspense } from "react";
import DashboardClient from "./DashboardClient";
import { DashboardProvider } from "@/context/DashboardContext";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white dark:bg-canvas">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
          <p className="text-sm text-text-secondary font-mono">Chargement du tableau de bord...</p>
        </div>
      </div>
    }>
      <DashboardProvider>
        <DashboardClient />
      </DashboardProvider>
    </Suspense>
  );
}
