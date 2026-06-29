"use client";

import { motion, AnimatePresence } from "framer-motion";

export type FilterState = {
  providers: string[];
  contractTypes: string[];
  remotes: string[];
};

interface AdvancedFiltersProps {
  isOpen: boolean;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}



const CONTRACTS = [
  { id: "cdi", label: "CDI" },
  { id: "freelance", label: "Freelance" },
  { id: "cdd", label: "CDD" },
  { id: "stage", label: "Stage/Alternance" },
];

const REMOTES = [
  { id: "full_remote", label: "Full Remote" },
  { id: "hybrid", label: "Hybride" },
  { id: "on_site", label: "Sur site" },
];

export default function AdvancedFilters({ isOpen, filters, onChange }: AdvancedFiltersProps) {


  const toggleContract = (id: string) => {
    const newContracts = filters.contractTypes.includes(id)
      ? filters.contractTypes.filter((c) => c !== id)
      : [...filters.contractTypes, id];
    onChange({ ...filters, contractTypes: newContracts });
  };

  const toggleRemote = (id: string) => {
    const newRemotes = filters.remotes.includes(id)
      ? filters.remotes.filter((r) => r !== id)
      : [...filters.remotes, id];
    onChange({ ...filters, remotes: newRemotes });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden mb-6"
        >
          <div className="rounded-xl border border-border/50 bg-surface/50 p-4 space-y-4 shadow-sm">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contract Types */}
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Type de contrat</h4>
                <div className="flex flex-wrap gap-2">
                  {CONTRACTS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleContract(c.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                        filters.contractTypes.includes(c.id)
                          ? "bg-brand/10 border-brand/40 text-brand"
                          : "bg-canvas border-border/50 text-text-secondary hover:border-border"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remote */}
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Mode de travail</h4>
                <div className="flex flex-wrap gap-2">
                  {REMOTES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => toggleRemote(r.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                        filters.remotes.includes(r.id)
                          ? "bg-brand/10 border-brand/40 text-brand"
                          : "bg-canvas border-border/50 text-text-secondary hover:border-border"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
