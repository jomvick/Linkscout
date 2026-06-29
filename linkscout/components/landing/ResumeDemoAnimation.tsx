"use client";

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function ResumeDemoAnimation() {
  // Gestion simple des étapes pour coordonner l'animation en boucle
  const [step, setStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < 3 ? prev + 1 : 1));
    }, 3000); // Alterne toutes les 3 secondes pour un rythme fluide
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md h-[320px] bg-slate-50 dark:bg-[#09090b] border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
      
      {/* ÉTAPE 1 : Le Glisser-Déposer (Drag & Drop UI) */}
      {step === 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center text-center space-y-4"
        >
          {/* Faux Fichier PDF qui glisse vers la zone */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-12 h-14 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center justify-center relative"
          >
            <span className="text-[10px] font-bold text-red-500">PDF</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[9px]">✓</div>
          </motion.div>

          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Glissez votre CV ici
            </p>
            <p className="text-xs text-slate-400 mt-1">Format PDF jusqu'à 5 Mo</p>
          </div>
        </motion.div>
      )}

      {/* ÉTAPE 2 : L'Analyse IA et Extraction des compétences */}
      {step === 2 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full space-y-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">
              Extraction LinkScout Intelligence...
            </p>
          </div>

          {/* Fausse barre de chargement animée */}
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "linear" }}
              className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]"
            />
          </div>

          {/* Apparition en cascade des tags extraits */}
          <div className="flex flex-wrap gap-2 pt-2">
            {['TypeScript', 'React.js', 'UI/UX Design', 'Tailwind'].map((skill, index) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.4 }}
                className="text-xs bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50"
              >
                {skill}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ÉTAPE 3 : Affichage instantané du résultat calibré */}
      {step === 3 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-3"
        >
          <p className="text-xs font-medium text-slate-400">✨ Offre idéale trouvée immédiatement :</p>
          
          {/* Fausse Job Card qui calque ton dashboard réel */}
          <div className="w-full bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono text-[10px]">LINKEDIN</span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Product Designer</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">SumIt Software — Paris, France</p>
            </div>

            {/* Le fameux badge de matching à 95% */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
              95% Match
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
