"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trans, useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES, PENDING_LANGUAGE_KEY } from "@/lib/languages";
import { applyLocale } from "@/lib/locale";

function LoginInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

  // Already signed in? Straight to the app — no second login needed.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next.startsWith("/") ? next : "/");
    });
  }, [router, next]);

  useEffect(() => {
    const saved = window.localStorage.getItem(PENDING_LANGUAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setLanguage(saved);
      applyLocale(i18n, saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickLanguage(code: string) {
    setLanguage(code);
    // Survives the OAuth redirect; synced into the profile after login.
    window.localStorage.setItem(PENDING_LANGUAGE_KEY, code);
    applyLocale(i18n, code);
  }

  async function signIn() {
    setLoading(true);
    window.localStorage.setItem(PENDING_LANGUAGE_KEY, language);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: "email profile https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  return (
    <main className="flex-1 flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-card border border-outline-soft rounded-xl p-8 flex flex-col items-center gap-6 shadow-sm">
        <Image src="/logo.png" alt="Compos" width={72} height={72} className="object-contain" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Compos</h1>
          <p className="text-sm text-ink-soft mt-1">{t("login.tagline")}</p>
        </div>
        {error && (
          <p className="text-sm text-tier-red bg-red-50 border border-red-200 rounded-md px-3 py-2 w-full text-center">
            {t("login.signInFailed")}
          </p>
        )}
        <label className="w-full text-left">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
            {t("login.language")}
          </span>
          <div className="relative mt-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft text-[18px] pointer-events-none">
              language
            </span>
            <select
              value={language}
              onChange={(e) => pickLanguage(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2.5 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>
        </label>
        <button
          onClick={signIn}
          disabled={loading}
          className="btn-press w-full flex items-center justify-center gap-3 bg-primary text-white rounded-lg py-2.5 font-medium hover:bg-primary-dark disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
          </svg>
          {loading ? t("login.redirecting") : t("login.continueWithGoogle")}
        </button>
        <p className="text-xs text-ink-soft text-center">
          <Trans
            i18nKey="login.agreement"
            components={{
              terms: <Link href="/terms" className="text-primary hover:underline" />,
              privacy: <Link href="/privacy" className="text-primary hover:underline" />,
            }}
          />
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
