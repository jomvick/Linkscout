import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import ToastContainer from "@/components/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LinkScout — Job Intelligence Platform",
  description:
    "Le moteur de recherche d'opportunités pour les profils tech. Trouvez des offres. Comprenez-les avec l'IA. Postulez plus intelligemment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
