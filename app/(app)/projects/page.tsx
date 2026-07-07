"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setProjects(data);
      const { data: taskRows } = await supabase
        .from("tasks")
        .select("project_id, completed")
        .in("project_id", data.map((p) => p.id));
      if (taskRows) {
        const c: Record<string, number> = {};
        for (const t of taskRows) {
          if (t.project_id && !t.completed) c[t.project_id] = (c[t.project_id] ?? 0) + 1;
        }
        setCounts(c);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    setCreateError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    // Projects have a FK to public.users — make sure the profile row exists.
    await ensureProfile(supabase);
    const { data, error } = await supabase
      .from("projects")
      .insert({ owner_id: user.id, title: t, description: description.trim() || null })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      setCreateError(error.message);
      return;
    }
    if (data) {
      router.push(`/projects/${data.id}`);
    }
  }

  async function deleteProject(e: React.MouseEvent, project: Project) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("projects.deleteConfirm", { title: project.title }))) return;
    setProjects((ps) => ps.filter((p) => p.id !== project.id));
    // Explicit cleanup in addition to the cascade FKs (migration 0003) so this
    // works even before the migration is applied.
    await supabase.from("tasks").delete().eq("project_id", project.id);
    await supabase.from("boards").delete().eq("project_id", project.id);
    await supabase.from("projects").delete().eq("id", project.id);
  }

  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-6xl w-full mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("projects.title")}</h1>
          <p className="text-sm text-ink-soft mt-1">{t("projects.subtitle")}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("projects.newProject")}
        </button>
      </header>

      {creating && (
        <form
          onSubmit={createProject}
          className="bg-card border border-outline-soft rounded-xl p-4 mb-6 space-y-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("projects.titlePlaceholder")}
            className="w-full px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("projects.descPlaceholder")}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary resize-none"
          />
          {createError && (
            <p className="text-sm text-tier-red bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {t("projects.createFailed", { message: createError })}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn-press px-4 py-2 rounded-lg text-sm text-ink-soft hover:bg-surface-low"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? t("projects.creating") : t("projects.create")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">{t("common.loading")}</p>
      ) : projects.length === 0 && !creating ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-[56px] text-outline-soft">folder_open</span>
          <p className="text-ink-soft mt-2">{t("projects.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="bento-card group bg-card border border-outline-soft rounded-xl p-5 flex flex-col min-h-[140px]"
            >
              <div className="flex items-start justify-between">
                <span className="material-symbols-outlined text-[28px] text-secondary group-hover:text-primary transition-colors">
                  folder_open
                </span>
                <div className="flex items-center gap-2">
                  {(counts[p.id] ?? 0) > 0 && (
                    <span className="text-xs bg-primary/10 text-primary font-semibold rounded-full px-2 py-0.5">
                      {t("projects.openCount", { count: counts[p.id] })}
                    </span>
                  )}
                  <button
                    onClick={(e) => deleteProject(e, p)}
                    title={t("projects.deleteProject")}
                    aria-label={t("projects.deleteProject")}
                    className="btn-press text-ink-soft hover:text-tier-red opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-ink group-hover:text-primary transition-colors mt-3 truncate">
                {p.title}
              </h3>
              {p.description && (
                <p className="text-sm text-ink-soft mt-1 line-clamp-2">{p.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
