import { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import ToastContainer from "@/components/Toast";
import { routing } from "@/i18n/routing";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: "LinkScout — " + t("dashboardTitle"),
    description: t("dashboardDesc"),
    metadataBase: new URL("https://linkscout-rust.vercel.app"),
    icons: {
      icon: "/icon.svg",
      apple: "/apple-icon.svg",
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: "LinkScout — " + t("dashboardTitle"),
      description: t("dashboardDesc"),
      url: "https://linkscout-rust.vercel.app",
      siteName: "LinkScout",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "LinkScout — AI-Powered Tech Job Search",
        },
      ],
      locale: locale === "fr" ? "fr_FR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "LinkScout — AI-Powered Tech Job Search",
      description: t("dashboardDesc"),
      images: ["/opengraph-image"],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProvider>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </AppProvider>
    </NextIntlClientProvider>
  );
}
