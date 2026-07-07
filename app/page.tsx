"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  { icon: "chat_bubble", titleKey: "landing.chatTitle", descKey: "landing.chatDesc", wide: true },
  { icon: "lightbulb", titleKey: "landing.brainstormTitle", descKey: "landing.brainstormDesc", wide: true },
  { icon: "checklist", titleKey: "landing.tasksTitle", descKey: "landing.tasksDesc", wide: false },
  { icon: "account_balance_wallet", titleKey: "landing.budgetTitle", descKey: "landing.budgetDesc", wide: false },
  { icon: "calendar_month", titleKey: "landing.calendarTitle", descKey: "landing.calendarDesc", wide: false },
];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="currentColor"
        d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
      />
    </svg>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/home")}`,
        scopes: "email profile https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  return (
    <main className="flex-1 bg-surface text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur border-b border-outline-soft">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Compos" width={28} height={28} className="object-contain" />
            <span className="text-lg font-semibold tracking-tight">Compos</span>
          </div>
          <button
            onClick={signIn}
            disabled={loading}
            className="btn-press flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-60"
          >
            <GoogleMark />
            {loading ? t("login.redirecting") : t("landing.signIn")}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(0,82,204,0.10),transparent_65%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 pt-16 md:pt-24 pb-14 md:pb-20 text-center">
          <Image
            src="/arrow-logo.png"
            alt="Compos"
            width={96}
            height={96}
            priority
            className="object-contain mx-auto mb-8"
          />
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-balance">
            {t("landing.headline")}
          </h1>
          <div className="mt-9">
            <button
              onClick={signIn}
              disabled={loading}
              className="btn-press inline-flex items-center gap-3 bg-primary text-white rounded-xl px-7 py-3.5 text-base font-medium hover:bg-primary-dark shadow-lg shadow-primary/25 disabled:opacity-60"
            >
              <GoogleMark />
              {loading ? t("login.redirecting") : t("landing.signIn")}
            </button>
            <p className="mt-3.5 text-xs text-ink-soft">{t("landing.ctaSub")}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-20 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">
          {t("landing.featuresTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className={`bg-card border border-outline-soft rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
                f.wide ? "lg:col-span-3" : "lg:col-span-2"
              }`}
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px]">{f.icon}</span>
              </div>
              <h3 className="font-semibold mb-1.5">{t(f.titleKey)}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-outline-soft bg-card">
        <div className="max-w-2xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">
            {t("landing.ctaTitle")}
          </h2>
          <p className="mt-3 text-ink-soft">{t("landing.ctaSub")}</p>
          <button
            onClick={signIn}
            disabled={loading}
            className="btn-press mt-8 inline-flex items-center gap-3 bg-primary text-white rounded-xl px-7 py-3.5 text-base font-medium hover:bg-primary-dark shadow-lg shadow-primary/25 disabled:opacity-60"
          >
            <GoogleMark />
            {loading ? t("login.redirecting") : t("landing.signIn")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-soft bg-surface">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={18} height={18} className="object-contain" />
            <span>{t("landing.rights", { year: new Date().getFullYear() })}</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {t("landing.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {t("landing.terms")}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
