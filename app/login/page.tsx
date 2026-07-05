"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/";

  async function signIn() {
    setLoading(true);
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
          <p className="text-sm text-ink-soft mt-1">
            Projects, tasks, brainstorming, calendar and budget — in one place.
          </p>
        </div>
        {error && (
          <p className="text-sm text-tier-red bg-red-50 border border-red-200 rounded-md px-3 py-2 w-full text-center">
            Sign-in failed. Please try again.
          </p>
        )}
        <button
          onClick={signIn}
          disabled={loading}
          className="btn-press w-full flex items-center justify-center gap-3 bg-primary text-white rounded-lg py-2.5 font-medium hover:bg-primary-dark disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
        <p className="text-xs text-ink-soft text-center">
          By continuing you agree to the{" "}
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
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
