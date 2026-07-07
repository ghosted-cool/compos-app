"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";
import { LANGUAGES } from "@/lib/languages";
import { applyLocale } from "@/lib/locale";
import type { Profile } from "@/lib/types";

/** Center-crop to a square and downscale, returning a compact JPEG data URL. */
function downscaleToDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not a readable image"));
    };
    img.src = url;
  });
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureProfile(supabase).then((p) => {
      if (p) {
        setProfile(p);
        setNameDraft(p.name ?? "");
        setLabelDraft(p.workspace_label ?? "Domain");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(kind: "ok" | "err", text: string) {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 3500);
  }

  async function saveName() {
    if (!profile) return;
    const name = nameDraft.trim();
    if (name === (profile.name ?? "")) return;
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ name: name || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      flash("err", t("settings.nameSaveFailed"));
    } else {
      setProfile({ ...profile, name: name || null });
      flash("ok", t("settings.nameSaved"));
    }
  }

  async function saveLabel() {
    if (!profile) return;
    const label = labelDraft.trim().slice(0, 25) || "Domain";
    if (label === (profile.workspace_label ?? "Domain")) return;
    setSavingLabel(true);
    const { error } = await supabase
      .from("users")
      .update({ workspace_label: label })
      .eq("id", profile.id);
    setSavingLabel(false);
    if (error) {
      flash("err", t("settings.labelSaveFailed"));
    } else {
      setProfile({ ...profile, workspace_label: label });
      setLabelDraft(label);
      flash("ok", t("settings.labelSaved"));
    }
  }

  async function saveLanguage(code: string) {
    if (!profile) return;
    const previous = profile.language;
    setProfile({ ...profile, language: code });
    applyLocale(i18n, code);
    const { error } = await supabase
      .from("users")
      .update({ language: code })
      .eq("id", profile.id);
    if (error) {
      setProfile((p) => (p ? { ...p, language: previous } : p));
      applyLocale(i18n, previous);
      flash("err", t("settings.languageSaveFailed"));
    } else {
      flash("ok", t("settings.languageSaved"));
    }
  }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    if (file.size > 10 * 1024 * 1024) {
      flash("err", t("settings.imageTooBig"));
      return;
    }
    setUploading(true);
    let dataUrl: string;
    try {
      // Downscaled to a small square and stored inline on the profile row —
      // no storage bucket needed.
      dataUrl = await downscaleToDataUrl(file, 256);
    } catch {
      setUploading(false);
      flash("err", t("settings.badImage"));
      return;
    }
    const { error } = await supabase
      .from("users")
      .update({ avatar_url: dataUrl })
      .eq("id", profile.id);
    setUploading(false);
    if (error) {
      flash("err", t("settings.avatarSaveFailed"));
    } else {
      setProfile({ ...profile, avatar_url: dataUrl });
      flash("ok", t("settings.avatarUpdated"));
    }
  }

  async function deleteAccount() {
    if (!confirm(t("settings.deleteAccountConfirm"))) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      setDeleting(false);
      flash("err", t("settings.deleteFailed"));
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-ink-soft">
        {t("common.loading")}
      </div>
    );
  }

  const previewTitle = t("sidebar.workspaceTitle", {
    name: (nameDraft.trim() || "Compos").split(" ")[0],
    label: labelDraft.trim() || "Domain",
  });

  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-2xl w-full mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-ink-soft mt-1">{t("settings.subtitle")}</p>
      </header>

      {message && (
        <div
          className={`mb-4 text-sm rounded-lg px-4 py-2.5 border ${
            message.kind === "ok"
              ? "bg-green-50 border-green-200 text-tier-green"
              : "bg-red-50 border-red-200 text-tier-red"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-card border border-outline-soft rounded-xl p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-low border border-outline-soft shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-[40px] text-ink-soft">
                person
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold mb-1.5">{t("settings.avatar")}</p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="btn-press flex items-center gap-2 border border-outline-soft px-3 py-1.5 rounded-lg text-sm hover:bg-surface-low disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              {uploading ? t("settings.uploading") : t("settings.uploadImage")}
            </button>
          </div>
        </div>

        {/* Workspace name */}
        <div>
          <label className="text-sm font-semibold block mb-1.5">
            {t("settings.workspaceName")}
          </label>
          <div className="flex gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder={t("settings.namePlaceholder")}
              className="flex-1 px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
            />
            <button
              onClick={saveName}
              disabled={saving || nameDraft.trim() === (profile.name ?? "")}
              className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </div>
          <p className="text-xs text-ink-soft mt-1.5">
            {t("settings.shownAs", { title: previewTitle })}
          </p>
        </div>

        {/* Workspace label */}
        <div>
          <label className="text-sm font-semibold block mb-1.5">
            {t("settings.workspaceLabel")}
          </label>
          <div className="flex gap-2">
            <input
              value={labelDraft}
              maxLength={25}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveLabel()}
              placeholder="Domain"
              className="flex-1 px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
            />
            <button
              onClick={saveLabel}
              disabled={
                savingLabel ||
                (labelDraft.trim() || "Domain") === (profile.workspace_label ?? "Domain")
              }
              className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </div>
          <p className="text-xs text-ink-soft mt-1.5">{t("settings.workspaceLabelHint")}</p>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm font-semibold block mb-1.5">{t("settings.language")}</label>
          <div className="relative max-w-xs">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft text-[18px] pointer-events-none">
              language
            </span>
            <select
              value={profile.language ?? "en"}
              onChange={(e) => saveLanguage(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary cursor-pointer"
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
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="text-sm font-semibold block mb-1.5">{t("settings.email")}</label>
          <div className="flex items-center gap-2 text-sm text-ink-soft bg-surface-low border border-outline-soft rounded-lg px-3 py-2 max-w-md">
            <span className="material-symbols-outlined text-[18px]">mail</span>
            {profile.email}
          </div>
          <p className="text-xs text-ink-soft mt-1.5">{t("settings.emailNote")}</p>
        </div>
      </section>

      {/* Legal */}
      <section className="bg-card border border-outline-soft rounded-xl p-6 mt-6">
        <h2 className="text-sm font-semibold mb-3">{t("settings.legal")}</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/privacy"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">shield</span>
            {t("settings.privacyPolicy")}
          </Link>
          <Link
            href="/terms"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            {t("settings.termsOfService")}
          </Link>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-card border border-red-200 rounded-xl p-6 mt-6">
        <h2 className="text-sm font-semibold text-tier-red mb-1.5">
          {t("settings.dangerZone")}
        </h2>
        <p className="text-xs text-ink-soft mb-4">{t("settings.deleteAccountWarning")}</p>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="btn-press flex items-center gap-2 bg-tier-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">delete_forever</span>
          {deleting ? t("settings.deleting") : t("settings.deleteAccount")}
        </button>
      </section>
    </div>
  );
}
