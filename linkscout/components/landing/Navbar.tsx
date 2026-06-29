"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import Logo from '@/components/Logo';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const t = useTranslations('Navbar');

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
    });
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 w-full bg-white/60 dark:bg-[#09090b]/60 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">

          <div
            className="cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Logo />
          </div>

          <div className="hidden md:flex items-center space-x-10">
            {['features', 'resume', 'stats'].map((key, i) => {
              const ids = ['features', 'resume-demo', 'stats'];
              return (
                <button
                  key={key}
                  onClick={() => scrollToSection(ids[i])}
                  className="text-sm font-normal text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors duration-200 min-h-[48px] flex items-center"
                >
                  {key === 'resume' ? t('resume') : t(key)}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <LanguageSwitcher />
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-brand/10 hover:bg-brand text-brand hover:text-white border border-brand/20 px-5 py-2 rounded-full transition-all duration-200 active:scale-[0.98] min-h-[48px] flex items-center"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-normal text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors duration-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/login?signup=true"
                  className="text-sm font-medium bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-600/20 px-5 py-2 rounded-full transition-all duration-200 shadow-sm shadow-blue-600/[0.02] active:scale-[0.98] min-h-[48px] flex items-center"
                >
                  {t('signup')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-500 dark:text-slate-400 focus:outline-none min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-[#09090b]/95 border-b border-slate-100 dark:border-slate-900 px-6 py-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <button onClick={() => scrollToSection('features')} className="block w-full text-left text-sm text-slate-500 dark:text-slate-400">{t('features')}</button>
          <button onClick={() => scrollToSection('resume-demo')} className="block w-full text-left text-sm text-slate-500 dark:text-slate-400">{t('resume')}</button>
          <button onClick={() => scrollToSection('stats')} className="block w-full text-left text-sm text-slate-500 dark:text-slate-400">{t('stats')}</button>
          <div className="block w-full text-left">
            <LanguageSwitcher />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
            {isAuthed ? (
              <Link href="/dashboard" className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-full w-full text-center">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400">{t('login')}</Link>
                <Link href="/login?signup=true" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-full">{t('signup')}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
