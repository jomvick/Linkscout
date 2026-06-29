"use client";

import type { Job } from "@/lib/types";
import { SkillBar } from "./SkillBadge";
import { Section, calcSkillImportance } from "./detail-panel-helpers";

interface Props {
  job: Job;
  analyzing: boolean;
  onAnalyze: () => void;
}

export default function DetailPanelSkills({ job, analyzing, onAnalyze }: Props) {
  return (
    <Section label="Technologies & compétences">
      {job.tech_stack && job.tech_stack.length > 0 ? (
        <div className="space-y-2">
          {job.tech_stack.map((tech, i) => (
            <SkillBar
              key={tech}
              name={tech}
              importance={calcSkillImportance(i)}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-text-secondary text-center py-8">
          {analyzing ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="w-4 h-4 border-2 border-border border-t-brand rounded-full animate-spin" />
              Extraction en cours...
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onAnalyze}
                className="text-brand hover:underline font-medium"
              >
                Analyser
              </button>
              <span> pour extraire la stack technique</span>
            </>
          )}
        </div>
      )}
    </Section>
  );
}
