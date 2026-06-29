"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import TimelineStep from "./TimelineStep";

const STEPS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Search",
    desc: "Express your need in natural language. An intelligent search engine that understands context.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    title: "AI Analysis",
    desc: "Every job is automatically enriched: summary, skills, salary, contract type.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: "Matching",
    desc: "Instant compatibility score. No more irrelevant jobs, no more wasted time.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "Application",
    desc: "AI-generated personalized message. Apply smarter, not faster.",
  },
];

export default function TimelineSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start center", "end center"],
  });

  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="parcours"
      className="mx-auto max-w-7xl px-6 pb-24 pt-16 scroll-mt-20"
    >
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Your next opportunity in 4 steps
        </h2>
        <p className="text-sm text-slate-400 dark:text-zinc-500">
          From need to application, LinkScout guides you every step of the way.
        </p>
      </div>

      <div className="relative max-w-lg mx-auto">
        {/* Ligne de fond statique */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border/40" />

        {/* Ligne de progression scroll-liée */}
        <motion.div
          className="absolute left-6 top-0 w-px origin-top bg-gradient-to-b from-violet-500 via-indigo-500 to-cyan-500"
          style={{ scaleY: lineScale }}
        />

        <div className="relative space-y-0">
          {STEPS.map((step, i) => (
            <TimelineStep
              key={step.title}
              index={i}
              icon={step.icon}
              title={step.title}
              desc={step.desc}
              isLast={i === STEPS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
