"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import TaskBoard from "@/components/TaskBoard";
import ShareModal from "@/components/ShareModal";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [project, setProject] = useState<Project | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardBusy, setBoardBusy] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data }, userRes, boardRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.auth.getUser(),
      supabase.from("boards").select("id").eq("project_id", id).maybeSingle(),
    ]);
    if (!data) {
      setNotFound(true);
      return;
    }
    setProject(data);
    setIsOwner(data.owner_id === userRes.data.user?.id);
    setBoardId(boardRes.data?.id ?? null);
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function createBoard() {
    if (boardBusy || !project) return;
    setBoardBusy(true);
    setBoardError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBoardBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("boards")
      .insert({ user_id: user.id, project_id: id, title: project.title })
      .select("id")
      .single();
    setBoardBusy(false);
    if (error) {
      setBoardError(error.message);
      return;
    }
    router.push(`/brainstorm?board=${data.id}`);
  }

  async function deleteProject() {
    if (!project) return;
    if (!confirm(t("projects.deleteConfirm", { title: project.title }))) return;
    // Explicit cleanup in addition to the cascade FKs (migration 0003) so this
    // works even before the migration is applied.
    await supabase.from("tasks").delete().eq("project_id", id);
    await supabase.from("boards").delete().eq("project_id", id);
    await supabase.from("projects").delete().eq("id", id);
    router.push("/projects");
  }

  if (notFound) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-ink-soft">{t("projects.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-6xl w-full mx-auto">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight truncate">
            {project?.title ?? "…"}
          </h1>
          {project?.description && (
            <p className="text-sm text-ink-soft mt-1">{project.description}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => setSharing(true)}
              className="btn-press flex items-center gap-2 border border-outline-soft bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-low"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              {t("common.share")}
            </button>
            <button
              onClick={deleteProject}
              className="btn-press flex items-center gap-2 border border-outline-soft bg-card px-3 py-2 rounded-lg text-sm text-tier-red hover:bg-red-50"
              title={t("projects.deleteProject")}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        )}
      </header>

      {/* Project board */}
      <section className="bg-card border border-outline-soft rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-[28px] text-secondary">lightbulb</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink text-sm">{t("projects.board")}</h2>
            <p className="text-xs text-ink-soft">{t("projects.boardHint")}</p>
            {boardError && (
              <p className="text-xs text-tier-red mt-1">
                {t("projects.boardCreateFailed", { message: boardError })}
              </p>
            )}
          </div>
        </div>
        {boardId ? (
          <button
            onClick={() => router.push(`/brainstorm?board=${boardId}`)}
            className="btn-press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            {t("projects.openBoard")}
          </button>
        ) : (
          isOwner && (
            <button
              onClick={createBoard}
              disabled={boardBusy}
              className="btn-press flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t("projects.createBoard")}
            </button>
          )
        )}
      </section>

      <TaskBoard projectId={id} />

      {sharing && (
        <ShareModal kind="project" resourceId={id} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
