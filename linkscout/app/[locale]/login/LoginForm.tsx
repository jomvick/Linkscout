"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import Link from "next/link";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("signup") === "true") {
      setMode("signup");
    }
  }, [searchParams]);
  const supabase = createClient();
  const isLogin = mode === "login";

  const signInWithSocial = async (provider: "google" | "github") => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (!isLogin) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) {
          console.error("Signup error:", error);
          setMessage({ type: "error", text: error.message });
        } else if (data.session) {
          const cb = searchParams.get("callbackUrl") || "/dashboard";
          router.push(cb);
          router.refresh();
          return;
        } else {
          setMessage({ type: "success", text: "Account created! Check your email to confirm before signing in." });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Login error:", error);
          setMessage({ type: "error", text: error.message });
        } else {
          const cb = searchParams.get("callbackUrl") || "/dashboard";
          router.push(cb);
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Auth exception:", err);
      setMessage({ type: "error", text: "An unexpected error occurred." });
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "A magic link has been sent to your email!" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." });
    }
    setLoading(false);
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setMessage(null);
    setPassword("");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4 dark:from-canvas dark:to-black/80 overflow-hidden select-none">
      <div className="pointer-events-none fixed inset-0 -z-10 dark:opacity-50">
        <div
          className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[150px] dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 bg-white dark:bg-surface/90 p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2.5 outline-none group mb-3">
              <Logo />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isLogin ? "Sign in" : "Create an account"}
            </h1>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              {isLogin ? "Find the best tech opportunities" : "Join the tech professionals using LinkScout"}
            </p>
          </div>

          {message && (
            <div className={`mb-5 p-3 rounded-xl text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5" suppressHydrationWarning>
            <button
              type="button"
              onClick={() => signInWithSocial("google")}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-surface px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.42 1.74l3.3-3.3C17.74 1.58 15.03 1 12 1 7.24 1 3.19 3.74 1.24 7.74l3.82 2.96C6 7.43 8.76 5.04 12 5.04z"/>
                <path fill="#4285F4" d="M23.45 12.3c0-.82-.07-1.6-.23-2.3H12v4.38h6.42c-.28 1.44-1.1 2.66-2.33 3.47l3.63 2.82c2.13-1.96 3.36-4.85 3.36-8.37z"/>
                <path fill="#FBBC05" d="M5.06 14.7a7.16 7.16 0 0 1 0-4.4L1.24 7.34A11.94 11.94 0 0 0 1 12c0 1.64.33 3.21.93 4.66l4.13-3.14z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.63-2.82c-1.1.74-2.52 1.18-4.33 1.18-3.24 0-6-2.39-6.94-5.66L1.24 15.93C3.19 19.93 7.24 23 12 23z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => signInWithSocial("github")}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-surface px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.008.069-.008 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-100 dark:bg-zinc-800" />
            <span className="text-[10px] font-mono text-slate-300 dark:text-zinc-600 uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left" suppressHydrationWarning>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-black/20 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-all duration-200 focus:border-brand focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-blue-50 dark:focus:ring-brand/10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">
                  {isLogin ? "Password" : "Choose a password"}
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-black/20 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-all duration-200 focus:border-brand focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-blue-50 dark:focus:ring-brand/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full bg-gradient-to-r from-brand to-[#0052a3] rounded-xl py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              ) : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-100 dark:bg-zinc-800" />
            <span className="text-[9px] font-mono text-slate-300 dark:text-zinc-600 uppercase tracking-wider">or passwordless</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-zinc-800" />
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold transition-colors mb-4 cursor-pointer disabled:opacity-40"
          >
            Send a magic link
          </button>

          <div className="text-center space-y-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {isLogin ? "New to LinkScout?" : "Already have an account?"}
              <button
                type="button"
                onClick={switchMode}
                className="ml-1 font-semibold text-brand hover:text-brand-hover hover:underline transition-all outline-none cursor-pointer"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
