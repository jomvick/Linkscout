"use client";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  dark?: boolean;
}

export default function Logo({ className = "", iconOnly = false, dark = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand shadow-sm shadow-brand/20">
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.58 5.58 0 006.25 10.5a5.58 5.58 0 012.038-3.712" />
        </svg>
      </div>
      {!iconOnly && (
        <span className={`text-sm font-semibold tracking-tight ${dark ? 'text-white' : 'text-[var(--c-text-primary)]'}`}>
          Link<span className="text-brand">Scout</span>
        </span>
      )}
    </div>
  );
}
