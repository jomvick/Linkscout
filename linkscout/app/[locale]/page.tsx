import { getTranslations } from "next-intl/server";
import Script from "next/script";
import { Navbar } from "@/components/landing/Navbar";
import WhyCard from "@/components/landing/WhyCard";
import DashboardPreview from "@/components/landing/DashboardPreview";
import { ResumeDemoAnimation } from "@/components/landing/ResumeDemoAnimation";
import TimelineSection from "@/components/landing/TimelineSection";
import HeroSection from "@/components/landing/HeroSection";
import { FooterCTA } from "@/components/landing/FooterCTA";

interface HomeProps {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LinkScout",
    operatingSystem: "All",
    applicationCategory: "BusinessApplication",
    description:
      "AI-powered tech job search automation and semantic matching platform for developers.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <Script
        id="schema-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
      <Navbar />

      {/* HERO */}
      <HeroSection />

      {/* DASHBOARD PREVIEW */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent pointer-events-none" />
        <section
          id="features"
          className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 scroll-mt-20"
        >
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('dashboardTitle')}
            </h2>
            <p className="text-sm text-slate-400 dark:text-zinc-500">
              {t('dashboardDesc')}
            </p>
          </div>
          <DashboardPreview />
        </section>
      </div>

      {/* WHY LINKSCOUT */}
      <section
        id="pourquoi"
        className="mx-auto max-w-7xl px-6 pb-24 pt-16 scroll-mt-20"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('whyTitle')}
          </h2>
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            {t('whyDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
            title={t('whyAI')}
            desc={t('whyAIDesc')}
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
            title={t('whyAuto')}
            desc={t('whyAutoDesc')}
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
            title={t('whyUnified')}
            desc={t('whyUnifiedDesc')}
          />
        </div>
      </section>

      {/* SECTION 4 : ANALYSE DE CV */}
      <section id="resume-demo" className="mx-auto max-w-7xl px-6 pb-24 pt-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('resumeTitle')}
          </h2>
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            {t('resumeDesc')}
          </p>
        </div>
        <div className="flex justify-center">
          <ResumeDemoAnimation />
        </div>
      </section>

      {/* TIMELINE */}
      <section id="stats"><TimelineSection /></section>

      {/* CTA & FOOTER */}
      <FooterCTA />
    </div>
    </>
  );
}
