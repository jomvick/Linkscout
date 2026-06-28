"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/lib/theme-context";
import { useDashboard } from "@/context/DashboardContext";
import { cacheStore } from "@/lib/cache/cacheStore";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────── */
interface Resume {
  id: string;
  raw_text: string;
  extracted_skills: string[];
  summary: string;
  status: string;
  error_message?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  use_resume_match: boolean;
  active_resume_id: string | null;
}

interface SearchPrefs {
  resultLimit: 10 | 20 | 50;
  minScore: number;
}

/* ── Helpers ────────────────────────────────────────────── */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-brand" : "bg-slate-200 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden">
      {children}
    </div>
  );
}

function SectionRow({
  icon,
  title,
  description,
  action,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-4 ${noBorder ? "" : "border-b border-slate-100 dark:border-zinc-800"}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
            {title}
          </p>
          {description && (
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
      {label}
    </p>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function SettingsView() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const { clearHistory, deleteHistoryItem, userId } = useDashboard();

  /* Account */
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  /* CV */
  const [resume, setResume] = useState<Resume | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    use_resume_match: false,
    active_resume_id: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Search prefs (localStorage) */
  const [prefs, setPrefs] = useState<SearchPrefs>({
    resultLimit: 10,
    minScore: 60,
  });

  /* UI feedback */
  const [historyCleared, setHistoryCleared] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  /* Load */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? null);
        setMemberSince(
          new Date(data.user.created_at).toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          }),
        );
      }
    });

    fetch("/api/resume")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setResume(data.resume);
          setSettings(
            data.settings ?? {
              use_resume_match: false,
              active_resume_id: null,
            },
          );
        }
      })
      .catch(() => {});

    const stored = cacheStore.getLocal<SearchPrefs>("search_prefs");
    if (stored) setPrefs(stored);
  }, []);

  /* ── CV handlers ── */
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      setUploadError("Format non supporté. Utilisez .pdf ou .txt.");
      return;
    }
    setUploadError("");
    setUploading(true);
    setUploadStatus(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUploadError("Non connecté"); setUploading(false); return; }

      // Upload to Supabase Storage
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("resumes").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadErr) { setUploadError(`Erreur Storage: ${uploadErr.message}`); setUploading(false); return; }

      // Register metadata & fire worker
      setUploadStatus("Traitement en cours...");
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_path: path, file_name: file.name }),
      });
      const data = await res.json();
      if (data.success) {
        setResume({ ...data.resume, extracted_skills: [], summary: "" } as Resume);
        setUploadStatus("Analyse en cours — le score apparaîtra dans quelques secondes");
        setTimeout(() => setUploadStatus(null), 6000);
      } else {
        setUploadError(data.error || "Erreur lors de l'enregistrement");
      }
    } catch {
      setUploadError("Erreur réseau");
    }
    setUploading(false);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleDeleteResume = async () => {
    const res = await fetch("/api/resume", { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setResume(null);
      setSettings((p) => ({ ...p, use_resume_match: false }));
    }
  };

  const toggleResumeMatch = async () => {
    const supabase = createClient();
    const next = !settings.use_resume_match;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("settings")
      .upsert(
        {
          user_id: user.id,
          use_resume_match: next,
          active_resume_id: next && resume ? resume.id : null,
        },
        { onConflict: "user_id" },
      );
    setSettings((p) => ({ ...p, use_resume_match: next }));
  };

  /* ── Prefs ── */
  const updatePrefs = (patch: Partial<SearchPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    cacheStore.setLocal("search_prefs", next);
  };

  /* ── Data actions ── */
  const handleClearHistory = async () => {
    await clearHistory();
    setHistoryCleared(true);
    setTimeout(() => setHistoryCleared(false), 2500);
  };

  const handleClearCache = () => {
    cacheStore.clearAll();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleExport = async () => {
    const supabase = createClient();
    const { data: history } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", userId ?? "");
    const { data: collections } = await supabase
      .from("collections")
      .select("*, job:job_id(*)")
      .eq("user_id", userId ?? "");
    const blob = new Blob(
      [
        JSON.stringify(
          { history, collections, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `linkscout-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    // Appel à une API de suppression — non encore implémentée côté serveur
    alert("Fonctionnalité de suppression de compte à finaliser côté serveur.");
    setDeleteConfirm(false);
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-zinc-950/40">
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Paramètres
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gérez votre compte, vos préférences et vos données.
          </p>
        </div>

        {/* ═══════════════ COMPTE ═══════════════ */}
        <div>
          <SectionHeader label="Compte" />
          <SectionCard>
            <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-blue-400 text-white text-xl font-bold select-none">
                {userEmail?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                  {userEmail ?? "—"}
                </p>
                {memberSince && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Membre depuis {memberSince}
                  </p>
                )}
                <span className="mt-1.5 inline-flex items-center rounded-full border border-brand/20 bg-brand/8 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  Plan Gratuit
                </span>
              </div>
            </div>

            <SectionRow
              noBorder
              icon={
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
                    d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                  />
                </svg>
              }
              title="Mot de passe"
              description="Gérez votre méthode d'authentification via Supabase."
              action={
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.resetPasswordForEmail(userEmail ?? "", {
                      redirectTo: `${window.location.origin}/auth/callback`,
                    });
                    alert("Email de réinitialisation envoyé !");
                  }}
                  className="rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Réinitialiser
                </button>
              }
            />
          </SectionCard>
        </div>

        {/* ═══════════════ APPARENCE ═══════════════ */}
        <div>
          <SectionHeader label="Apparence" />
          <SectionCard>
            <SectionRow
              icon={
                isDark ? (
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
                )
              }
              title="Mode sombre"
              description="Bascule l'interface entre le thème clair et sombre."
              noBorder
              action={<Toggle checked={isDark} onChange={toggleTheme} />}
            />
          </SectionCard>
        </div>

        {/* ═══════════════ CV & MATCHING ═══════════════ */}
        <div>
          <SectionHeader label="CV & Matching IA" />
          <SectionCard>
            {!resume ? (
              <div className="p-5">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    dragOver
                      ? "border-brand bg-brand/5"
                      : "border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/30"
                  }`}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
                    <svg
                      className="h-6 w-6 text-slate-400 dark:text-zinc-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                    Importer votre CV
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Glissez-déposez ou cliquez — PDF ou TXT
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="mt-4 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? "Analyse en cours…" : "Choisir un fichier"}
                  </button>
                  {uploadError && (
                    <p className="mt-3 text-xs text-red-500">{uploadError}</p>
                  )}
                  {uploadStatus && !uploadError && (
                    <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">{uploadStatus}</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4 px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                        CV importé
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          — {resume.extracted_skills.length} compétences
                        </span>
                        {resume.status === "processing" && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Analyse
                          </span>
                        )}
                        {resume.status === "failed" && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/30 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                            Échec
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 shrink-0">
                        Mis à jour le {formatDate(resume.updated_at)}
                      </p>
                    </div>
                    {resume.status === "failed" && resume.error_message && (
                      <p className="mt-2 text-xs text-red-500 dark:text-red-400 leading-relaxed bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                        Erreur : {resume.error_message}
                      </p>
                    )}
                    {resume.summary && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed bg-slate-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2">
                        {resume.summary}
                      </p>
                    )}
                    {resume.extracted_skills.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {resume.extracted_skills.slice(0, 14).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-zinc-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.extracted_skills.length > 14 && (
                          <span className="text-xs text-slate-400 self-center">
                            +{resume.extracted_skills.length - 14}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90 transition-colors"
                      >
                        Mettre à jour
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteResume}
                        className="rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>

                <SectionRow
                  noBorder
                  icon={
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
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                  }
                  title="Matching automatique par CV"
                  description="Affiche un score personnalisé sur chaque offre selon votre profil."
                  action={
                    <Toggle
                      checked={settings.use_resume_match}
                      onChange={toggleResumeMatch}
                      disabled={!resume}
                    />
                  }
                />
              </>
            )}
          </SectionCard>
        </div>

        {/* ═══════════════ PRÉFÉRENCES DE RECHERCHE ═══════════════ */}
        <div>
          <SectionHeader label="Préférences de recherche" />
          <SectionCard>
            <SectionRow
              icon={
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
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              }
              title="Résultats par recherche"
              description="Nombre d'offres récupérées à chaque scraping."
              action={
                <div className="flex rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden text-xs font-semibold">
                  {([10, 20, 50] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updatePrefs({ resultLimit: v })}
                      className={`px-3 py-1.5 transition-colors ${
                        prefs.resultLimit === v
                          ? "bg-brand text-white"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
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
                        d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                      Score minimum
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Filtrer les offres sous ce seuil de pertinence.
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand tabular-nums">
                  {prefs.minScore}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={prefs.minScore}
                onChange={(e) =>
                  updatePrefs({ minScore: Number(e.target.value) })
                }
                className="w-full h-1.5 accent-brand cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <SectionRow
              noBorder
              icon={
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
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
              }
              title="Langue de l'interface"
              description="Choix de la langue pour l'UI et les analyses IA."
              action={
                <div className="flex rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden text-xs font-semibold">
                  {["FR", "EN"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`px-3 py-1.5 transition-colors ${
                        lang === "FR"
                          ? "bg-brand text-white"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              }
            />
          </SectionCard>
        </div>

        {/* ═══════════════ DONNÉES & CONFIDENTIALITÉ ═══════════════ */}
        <div>
          <SectionHeader label="Données & Confidentialité" />
          <SectionCard>
            <SectionRow
              icon={
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
              }
              title="Vider l'historique"
              description="Supprime toutes vos recherches précédentes."
              action={
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    historyCleared
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {historyCleared ? "✓ Effacé" : "Vider"}
                </button>
              }
            />
            <SectionRow
              icon={
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
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.917c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 2.917v2.917c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-2.917"
                  />
                </svg>
              }
              title="Vider le cache local"
              description="Supprime les résultats mis en cache dans ce navigateur."
              action={
                <button
                  type="button"
                  onClick={handleClearCache}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    cacheCleared
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cacheCleared ? "✓ Vidé" : "Vider"}
                </button>
              }
            />
            <SectionRow
              icon={
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
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              }
              title="Exporter mes données"
              description="Télécharge votre historique et favoris au format JSON."
              action={
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-lg border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Exporter (.json)
                </button>
              }
            />

            {/* Danger zone */}
            <div className="border-t border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40 text-red-500">
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
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Supprimer mon compte
                    </p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Action irréversible — toutes vos données seront perdues.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    deleteConfirm
                      ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                      : "border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  }`}
                >
                  {deleteConfirm ? "Confirmer la suppression" : "Supprimer"}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-300 dark:text-zinc-700 pb-2">
          LinkScout v0.1 — {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
