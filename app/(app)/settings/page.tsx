"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";
import { LANGUAGES } from "@/lib/languages";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureProfile(supabase).then((p) => {
      if (p) {
        setProfile(p);
        setNameDraft(p.name ?? "");
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
      flash("err", "Could not save the name.");
    } else {
      setProfile({ ...profile, name: name || null });
      flash("ok", "Workspace name saved.");
    }
  }

  async function saveLanguage(code: string) {
    if (!profile) return;
    const previous = profile.language;
    setProfile({ ...profile, language: code });
    const { error } = await supabase
      .from("users")
      .update({ language: code })
      .eq("id", profile.id);
    if (error) {
      setProfile((p) => (p ? { ...p, language: previous } : p));
      flash("err", "Could not save the language.");
    } else {
      flash("ok", "Language saved.");
    }
  }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    if (file.size > 10 * 1024 * 1024) {
      flash("err", "Image must be under 10 MB.");
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
      flash("err", "That file doesn't look like a readable image.");
      return;
    }
    const { error } = await supabase
      .from("users")
      .update({ avatar_url: dataUrl })
      .eq("id", profile.id);
    setUploading(false);
    if (error) {
      flash("err", "Could not save the avatar.");
    } else {
      setProfile({ ...profile, avatar_url: dataUrl });
      flash("ok", "Avatar updated.");
    }
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-ink-soft">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-2xl w-full mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-soft mt-1">Your profile and preferences.</p>
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
            <p className="text-sm font-semibold mb-1.5">Avatar</p>
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
              {uploading ? "Uploading…" : "Upload image"}
            </button>
          </div>
        </div>

        {/* Workspace name */}
        <div>
          <label className="text-sm font-semibold block mb-1.5">Workspace name</label>
          <div className="flex gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="Your name"
              className="flex-1 px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
            />
            <button
              onClick={saveName}
              disabled={saving || nameDraft.trim() === (profile.name ?? "")}
              className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-ink-soft mt-1.5">
            Shown in the sidebar as “{(nameDraft.trim() || "Compos").split(" ")[0]}
            &apos;s Domain”.
          </p>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm font-semibold block mb-1.5">Language</label>
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
          <label className="text-sm font-semibold block mb-1.5">Email</label>
          <div className="flex items-center gap-2 text-sm text-ink-soft bg-surface-low border border-outline-soft rounded-lg px-3 py-2 max-w-md">
            <span className="material-symbols-outlined text-[18px]">mail</span>
            {profile.email}
          </div>
          <p className="text-xs text-ink-soft mt-1.5">
            Linked to your Google account — it can&apos;t be changed here.
          </p>
        </div>
      </section>
    </div>
  );
}
