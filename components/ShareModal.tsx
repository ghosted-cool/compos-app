"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Permission, Share } from "@/lib/types";

export default function ShareModal({
  kind,
  resourceId,
  onClose,
}: {
  kind: "project" | "board";
  resourceId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const table = kind === "project" ? "project_shares" : "board_shares";
  const fk = kind === "project" ? "project_id" : "board_id";

  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("view");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from(table)
      .select("id,shared_with,share_token,permission,created_at")
      .eq(fk, resourceId)
      .order("created_at");
    if (data) setShares(data);
  }, [supabase, table, fk, resourceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createShare(sharedWith: string | null) {
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from(table)
      .insert({
        [fk]: resourceId,
        shared_with: sharedWith ? sharedWith.toLowerCase().trim() : null,
        permission,
        created_by: user.id,
      })
      .select("id,shared_with,share_token,permission,created_at")
      .single();
    setBusy(false);
    if (data) {
      setShares((s) => [...s, data]);
      if (!sharedWith) copyLink(data.share_token);
    } else if (error?.code === "23505") {
      alert("Already shared with that email.");
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await createShare(email);
    setEmail("");
  }

  async function revoke(id: string) {
    setShares((s) => s.filter((x) => x.id !== id));
    await supabase.from(table).delete().eq("id", id);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const linkShares = shares.filter((s) => !s.shared_with);
  const emailShares = shares.filter((s) => s.shared_with);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-outline-soft shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Share this {kind === "project" ? "project" : "board"}
          </h2>
          <button onClick={onClose} className="btn-press text-ink-soft hover:text-ink">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Permission toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-ink-soft">New shares can</span>
          <div className="flex bg-surface rounded-lg border border-outline-soft p-0.5">
            {(["view", "edit"] as Permission[]).map((p) => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className={`btn-press px-3 py-1 rounded-md text-sm capitalize ${
                  permission === p ? "bg-primary text-white" : "text-ink-soft"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Email invite */}
        <form onSubmit={invite} className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@email.com"
            className="flex-1 px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
          >
            Invite
          </button>
        </form>

        {/* Link share */}
        <button
          onClick={() =>
            linkShares.length > 0 ? copyLink(linkShares[0].share_token) : createShare(null)
          }
          disabled={busy}
          className="btn-press w-full flex items-center justify-center gap-2 border border-outline-soft rounded-lg py-2 text-sm font-medium hover:bg-surface-low mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">link</span>
          {copied ? "Link copied!" : linkShares.length > 0 ? "Copy share link" : "Create share link"}
        </button>

        {/* Existing shares */}
        {(emailShares.length > 0 || linkShares.length > 0) && (
          <div className="border-t border-outline-soft pt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {linkShares.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px] text-ink-soft">link</span>
                <span className="flex-1 text-ink-soft truncate">
                  Anyone with the link · {s.permission}
                </span>
                <button
                  onClick={() => revoke(s.id)}
                  className="btn-press text-xs text-tier-red hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))}
            {emailShares.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[16px] text-ink-soft">person</span>
                <span className="flex-1 truncate">{s.shared_with}</span>
                <span className="text-xs text-ink-soft capitalize">{s.permission}</span>
                <button
                  onClick={() => revoke(s.id)}
                  className="btn-press text-xs text-tier-red hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-ink-soft mt-4">
          Invited people sign in with Google using the invited email. Share links grant access to
          whoever opens them after signing in.
        </p>
      </div>
    </div>
  );
}
