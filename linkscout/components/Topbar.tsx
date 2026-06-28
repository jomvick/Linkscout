"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  searching?: boolean;
  resultCount?: number;
  onCmdK?: () => void;
  onNavigate?: (
    view: "dashboard" | "favorites" | "alerts" | "history" | "settings",
  ) => void;
}

const NAV_LINKS = [
  {
    view: "settings" as const,
    label: "Paramètres",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    view: "favorites" as const,
    label: "Favoris",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    ),
  },
  {
    view: "alerts" as const,
    label: "Alertes",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    ),
  },
  {
    view: "history" as const,
    label: "Historique",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export default function Topbar({
  searchValue,
  onSearchChange,
  onSubmit,
  searching,
  resultCount,
  onCmdK,
  onNavigate,
}: TopbarProps) {
  const { isDark, toggle } = useTheme();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const navigate = (
    view: "dashboard" | "favorites" | "alerts" | "history" | "settings",
  ) => {
    setDropdownOpen(false);
    onNavigate?.(view);
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "?";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <header className="shrink-0 border-b border-border bg-surface/90 backdrop-blur-xl supports-backdrop-blur:bg-surface/80">
      <div className="flex h-14 items-center gap-3 px-5">
        {/* Search bar */}
        <form onSubmit={onSubmit} className="flex-1 max-w-xl min-w-0">
          <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-canvas/80 px-3.5 py-1.75 transition-all duration-200 focus-within:border-brand/40 focus-within:shadow-sm focus-within:shadow-brand/5">
            {searching ? (
              <span className="h-4 w-4 shrink-0 border-2 border-border border-t-brand rounded-full animate-spin" />
            ) : (
              <svg
                className="h-4 w-4 shrink-0 text-text-secondary/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un rôle, une techno, un lieu..."
              aria-label="Rechercher une opportunité"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-secondary/40 outline-none"
            />
            {resultCount !== undefined && resultCount > 0 && (
              <span className="shrink-0 text-[10px] font-semibold text-text-secondary/40 tabular-nums bg-canvas border border-border/40 px-1.5 py-0.5 rounded-md">
                {resultCount}
              </span>
            )}
            <button
              type="button"
              onClick={onCmdK}
              aria-label="Ouvrir la palette de commandes"
              className="hidden sm:inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border/60 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary/40 transition-colors hover:text-text-secondary/60"
            >
              <span>⌘</span>K
            </button>
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary/50 hover:text-text-primary hover:border-border transition-colors"
            aria-label={
              isDark ? "Activer le mode clair" : "Activer le mode sombre"
            }
          >
            {isDark ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            )}
          </button>

          <div className="h-4 w-px bg-border/40" />

          {/* Profile button + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Menu utilisateur"
              aria-expanded={dropdownOpen}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-2 transition-all outline-none cursor-pointer select-none ${
                user
                  ? "bg-gradient-to-tr from-brand to-blue-400 text-white ring-transparent hover:ring-brand/20 dark:hover:ring-brand/30"
                  : "bg-border/30 text-text-secondary/60 ring-transparent hover:bg-border/50"
              }`}
            >
              {user ? (
                userInitial
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-2xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 ring-1 ring-black/5 dark:ring-white/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {user ? (
                  <>
                    {/* ── User Info ── */}
                    <div className="flex items-center gap-3 px-4 py-4 bg-canvas/50 border-b border-border/60">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-blue-400 text-white text-sm font-bold select-none">
                        {userInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary leading-tight">
                          {user.email}
                        </p>
                        {memberSince && (
                          <p className="text-[11px] text-text-secondary/50 mt-0.5">
                            Membre depuis {memberSince}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-brand/20 bg-brand/8 px-2 py-0.5 text-[10px] font-semibold text-brand">
                        Gratuit
                      </span>
                    </div>

                    {/* ── Navigation links ── */}
                    <div className="p-1.5">
                      {NAV_LINKS.map(({ view, label, icon }) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => navigate(view)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary/80 hover:bg-canvas hover:text-text-primary transition-colors group"
                        >
                          <span className="text-text-secondary/50 group-hover:text-brand transition-colors">
                            {icon}
                          </span>
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* ── Theme toggle ── */}
                    <div className="border-t border-border/60 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-text-secondary/50">
                            {isDark ? (
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.75}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.75}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="text-sm text-text-primary/80">
                            {isDark ? "Mode sombre" : "Mode clair"}
                          </span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isDark}
                          onClick={toggle}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                            isDark ? "bg-brand" : "bg-border"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              isDark ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* ── Sign out ── */}
                    <div className="border-t border-border/60 p-1.5">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <svg
                          className="h-4 w-4 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Déconnexion
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Guest state ── */
                  <div className="p-3 space-y-1">
                    <p className="px-3 py-2 text-xs text-text-secondary/50">
                      Connecte-toi pour accéder à toutes les fonctionnalités.
                    </p>
                    <a
                      href="/login"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-canvas transition-colors"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 text-text-secondary/50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      Se connecter
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
