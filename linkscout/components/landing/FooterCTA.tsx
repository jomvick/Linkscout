"use client";

import { useState, useEffect } from 'react';

export function FooterCTA() {
  // Simulation d'un ping de statut pour faire clignoter le "All systems operational"
  const [isPinged, setIsPinged] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPinged(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCTAClick = () => {
    // Redirection fluide vers le dashboard en mode invité
    window.location.href = '/dashboard?q=Software+Engineer';
  };

  return (
    <section className="w-full bg-slate-50 dark:bg-[#09090b] border-t border-slate-200/60 dark:border-slate-800/80 transition-colors duration-300">
      
      {/* ─── SECTION 6 : CALL TO ACTION FINAL ─── */}
      <div className="max-w-4xl mx-auto text-center px-6 py-20 md:py-28 flex flex-col items-center justify-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Ready to automate your search?
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Let LinkScout filter the noise, analyze job offers, and supercharge your applications while you focus on what matters.
        </p>
        
        {/* Bouton CTA Massif avec effet Glow discret */}
        <div className="pt-4 group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r fn-from bg-blue-600 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
          <button 
            onClick={handleCTAClick}
            className="relative px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-blue-600/10 active:scale-[0.98] transition-all duration-200 flex items-center space-x-3"
          >
            <span>Start a free search</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
        
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No credit card required. Instant guest mode.
        </p>
      </div>

      {/* ─── PIED DE PAGE (FOOTER) ─── */}
      <footer className="max-w-7xl mx-auto px-6 pb-8 border-t border-slate-200/40 dark:border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Gauche : Brand & Copyright */}
        <div className="flex items-center space-x-2.5 text-slate-400 dark:text-slate-500 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">LinkScout</span>
          <span>•</span>
          <span>© 2026 All rights reserved.</span>
        </div>

        {/* Centre : Liens discrets */}
        <div className="flex items-center space-x-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <a 
            href="https://github.com/jomvick" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center space-x-1.5 min-h-[48px] min-w-[48px] justify-center"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>GitHub</span>
          </a>
          <a href="/legal" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">Legal</a>
          <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">Privacy</a>
        </div>

        {/* Droite : Statut Système Interactif */}
        <div className="flex items-center space-x-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full select-none shadow-sm shadow-emerald-500/[0.02]">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000 ${isPinged ? 'scale-150' : 'scale-100'}`} />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tracking-tight">
            All systems operational
          </span>
        </div>

      </footer>
    </section>
  );
}
