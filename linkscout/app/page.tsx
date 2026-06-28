import Logo from "@/components/Logo";
import WhyCard from "@/components/landing/WhyCard";
import DashboardPreview from "@/components/landing/DashboardPreview";
import CommandPaletteDemo from "@/components/landing/CommandPaletteDemo";
import TimelineSection from "@/components/landing/TimelineSection";
import HeroSection from "@/components/landing/HeroSection";
import CTASection from "@/components/landing/CTASection";
import DashboardButton from "@/components/DashboardButton";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-canvas text-text-primary transition-colors duration-300">
      {/* ── Background (Linear-inspired) ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.3] dark:opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-[-30%] left-[-15%] h-[70%] w-[70%] rounded-full bg-blue-500/5 blur-[150px] dark:bg-blue-500/10" />
        <div className="absolute top-[40%] right-[-15%] h-[60%] w-[60%] rounded-full bg-indigo-500/5 blur-[120px] dark:bg-indigo-500/10" />
        <div className="absolute bottom-[-20%] left-[20%] h-[50%] w-[50%] rounded-full bg-sky-500/5 blur-[100px] dark:bg-sky-500/10" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-canvas/90 backdrop-blur-lg border-b border-border/50 transition-colors">
        <div className="relative mx-auto flex max-w-7xl h-16 items-center px-6">
          <a
            href="/"
            className="flex shrink-0 items-center gap-2.5 outline-none"
            aria-label="LinkScout accueil"
          >
            <Logo />
          </a>

          <nav
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5"
            aria-label="Navigation principale"
          >
            {[
              { label: "Recherche", href: "#hero" },
              { label: "Aperçu", href: "#apercu" },
              { label: "Pourquoi", href: "#pourquoi" },
              { label: "Parcours", href: "#parcours" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DashboardButton />
          </div>
        </div>
      </header>

      {/* HERO */}
      <HeroSection />

      {/* DASHBOARD PREVIEW */}
      <section
        id="apercu"
        className="mx-auto max-w-7xl px-6 pb-24 scroll-mt-20"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Un dashboard pensé pour l&apos;action
          </h2>
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            Score IA, résumé généré, skills mis en avant, match instantané. Tout
            ce qu&apos;il vous faut pour décider.
          </p>
        </div>
        <DashboardPreview />
      </section>

      {/* WHY LINKSCOUT */}
      <section
        id="pourquoi"
        className="mx-auto max-w-7xl px-6 pb-24 scroll-mt-20"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Pourquoi LinkScout ?
          </h2>
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            Pas un énième job board. Un outil pensé pour les développeurs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          <WhyCard
            index={0}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            }
            title="Compréhension IA"
            desc="Décrivez votre besoin naturellement. L'IA comprend votre profil et trouve les offres qui vous correspondent vraiment."
          />
          <WhyCard
            index={1}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
                />
              </svg>
            }
            title="Analyse automatique"
            desc="Résumés générés instantanément. Extraction de la stack technique, du salaire, du type de contrat. En un clic."
          />
          <WhyCard
            index={2}
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.893 13.393l-3.444 3.444a3.375 3.375 0 01-4.773 0l-3.444-3.444M12 20.25l-4.5-4.5M15.75 6.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            title="Recherche unifiée"
            desc="Toutes les opportunités au même endroit. Plus besoin de jongler entre LinkedIn, Welcome to the Jungle et Indeed."
          />
        </div>
      </section>

      {/* COMMAND PALETTE */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            La puissance d&apos;une command palette
          </h2>
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            Appuyez sur{" "}
            <kbd className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-1.5 py-0.5 text-[11px] font-mono text-slate-500">
              ⌘K
            </kbd>{" "}
            et laissez-vous guider.
          </p>
        </div>
        <CommandPaletteDemo />
      </section>

      {/* TIMELINE */}
      <TimelineSection />

      {/* CTA */}
      <CTASection />

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors">
        <div className="mx-auto max-w-7xl px-6">
          <p>© {new Date().getFullYear()} LinkScout. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
