"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TaskBoard from "@/components/TaskBoard";
import ShareModal from "@/components/ShareModal";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, userRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.auth.getUser(),
    ]);
    if (!data) {
      setNotFound(true);
      return;
    }
    setProject(data);
    setIsOwner(data.owner_id === userRes.data.user?.id);
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteProject() {
    if (!confirm("Delete this project? Its tasks will be kept without a project.")) return;
    await supabase.from("projects").delete().eq("id", id);
    router.push("/projects");
  }

  if (notFound) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-ink-soft">Project not found or you don&apos;t have access.</p>
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
              Share
            </button>
            <button
              onClick={deleteProject}
              className="btn-press flex items-center gap-2 border border-outline-soft bg-card px-3 py-2 rounded-lg text-sm text-tier-red hover:bg-red-50"
              title="Delete project"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        )}
      </header>

      <TaskBoard projectId={id} />

      {sharing && (
        <ShareModal kind="project" resourceId={id} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
