"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Alert } from "@/lib/types";

export default function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleToggle = async (alert: Alert) => {
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !alert.is_active }),
    });
    fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    fetchAlerts();
  };

  const platformIcon = (p: string) => (p === "discord" ? "💬" : "✈️");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-sm font-semibold text-text-primary">Alertes</h1>
          <p className="text-xs text-text-secondary/60 mt-0.5">
            Recevez les opportunités automatiquement
          </p>
        </div>
        {alerts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            + Nouvelle alerte
          </button>
        )}
      </div>

      {alerts.length === 0 && !showForm ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-canvas flex items-center justify-center border border-border/50">
              <svg className="w-6 h-6 text-text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-secondary">Aucune alerte configurée</p>
            <p className="text-xs text-text-secondary/50 mt-1">
              Créez une alerte pour recevoir les offres qui matchent vos critères directement sur Discord ou Telegram.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
            >
              Configurer une alerte
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="group flex items-center gap-4 px-4 py-3 rounded-xl bg-surface border border-border/60 hover:border-border transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center text-sm shrink-0">
                  {platformIcon(alert.platform)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {alert.title}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-light text-brand uppercase tracking-wider">
                      {alert.keyword}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary/50 mt-0.5">
                    Score min: {alert.min_score}% · {alert.platform === "discord" ? "Webhook Discord" : "Telegram Bot"}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity max-lg:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleToggle(alert)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${alert.is_active ? "bg-brand" : "bg-border"}`}
                    aria-label={alert.is_active ? "Désactiver" : "Activer"}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${alert.is_active ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(alert.id)}
                    className="p-1.5 rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <AlertForm
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              fetchAlerts();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

type Platform = "discord" | "telegram";

function AlertForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>("discord");
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [minScore, setMinScore] = useState(80);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !keyword.trim()) {
      setError("Le nom et le mot-clé sont requis");
      return;
    }

    const webhook_url =
      platform === "discord"
        ? webhookUrl.trim()
        : `${telegramBotToken.trim()}|||${telegramChatId.trim()}`;

    if (platform === "discord" && !webhookUrl.trim()) {
      setError("L'URL du webhook Discord est requise");
      return;
    }
    if (platform === "telegram" && (!telegramBotToken.trim() || !telegramChatId.trim())) {
      setError("Le token et le chat ID Telegram sont requis");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          keyword: keyword.trim(),
          platform,
          webhook_url,
          filters: { remote: isRemote },
          min_score: minScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        return;
      }
      onCreated();
    } catch {
      setError("Erreur réseau");
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] pb-8 px-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="px-6 pt-6 pb-2 space-y-1">
          <h3 className="text-base font-bold text-text-primary">
            Créer une alerte intelligente
          </h3>
          <p className="text-xs text-text-secondary/50">
            Recevez des notifications instantanées dès qu'une offre tech correspond à vos critères.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          {/* Titre & Mot-clé */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider text-text-secondary uppercase font-mono">
                Nom de l'alerte
              </label>
              <input
                type="text"
                required
                placeholder="ex: Rôles Rust Remote"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas/50 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 outline-none transition-all focus:border-brand focus:bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider text-text-secondary uppercase font-mono">
                Mot-clé ciblé
              </label>
              <input
                type="text"
                required
                placeholder="ex: Rust Engineer"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas/50 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 outline-none transition-all focus:border-brand focus:bg-surface"
              />
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="p-4 rounded-xl border border-border bg-canvas/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-text-primary">Exclusivité Télétravail</span>
                <p className="text-[11px] text-text-secondary/50">Ne notifier que si le poste est 100% remote.</p>
              </div>
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
              />
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-text-primary">Match Score minimal</span>
                <span className="font-mono text-brand">{minScore}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>
          </div>

          {/* Choix plateforme */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider text-text-secondary uppercase font-mono">
              Canal de destination
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-canvas">
              {(["discord", "telegram"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    platform === p
                      ? "bg-surface text-text-primary shadow-sm border border-border"
                      : "text-text-secondary/50 hover:text-text-primary"
                  }`}
                >
                  {p === "discord" ? "👾 Discord Webhook" : "✈️ Telegram Bot"}
                </button>
              ))}
            </div>
          </div>

          {/* Config dynamique */}
          <div className="min-h-[80px]">
            <AnimatePresence mode="wait">
              {platform === "discord" ? (
                <motion.div
                  key="discord"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold tracking-wider text-text-secondary uppercase font-mono">
                      Webhook URL Discord
                    </label>
                    <a
                      href="https://support.discord.com/hc/fr/articles/228383668"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-text-secondary/40 hover:text-brand underline font-mono"
                    >
                      Où le trouver ?
                    </a>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full rounded-xl border border-border bg-canvas/50 px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary/30 outline-none transition-all focus:border-brand focus:bg-surface"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="telegram"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold tracking-wider text-text-secondary uppercase font-mono">
                      Token du Bot Telegram
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123456:ABC-DEF1234ghIkl-zyx"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas/50 px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary/30 outline-none transition-all focus:border-brand focus:bg-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold tracking-wider text-text-secondary uppercase font-mono">
                        Chat ID
                      </label>
                      <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-text-secondary/40 hover:text-brand underline font-mono"
                      >
                        @userinfobot
                      </a>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="ex: -100123456789"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-canvas/50 px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-secondary/30 outline-none focus:border-brand focus:bg-surface"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-hover py-3 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Création..." : "Activer l'Alerte Automatique"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
