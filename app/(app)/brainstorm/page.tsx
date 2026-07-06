"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import ShareModal from "@/components/ShareModal";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";
import type { Board, Chat } from "@/lib/types";

const BoardCanvas = dynamic(() => import("@/components/BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-ink-soft text-sm">
      Loading canvas…
    </div>
  ),
});

function BrainstormInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const boardParam = searchParams.get("board");
  const [boards, setBoards] = useState<Pick<Board, "id" | "title">[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [chats, setChats] = useState<Pick<Chat, "id" | "title">[]>([]);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Boards have a FK to public.users — make sure the profile row exists
    // before any board is created.
    await ensureProfile(supabase);

    const [boardsRes, chatsRes] = await Promise.all([
      supabase
        .from("boards")
        .select("id,title")
        .order("updated_at", { ascending: false }),
      supabase
        .from("chats")
        .select("id,title")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);
    if (chatsRes.data) setChats(chatsRes.data);
    if (boardsRes.error) {
      setLoadError(boardsRes.error.message);
      return;
    }

    let list = boardsRes.data ?? [];
    if (list.length === 0) {
      const { data: created, error: createError } = await supabase
        .from("boards")
        .insert({ user_id: user.id, title: "My board" })
        .select("id,title")
        .single();
      if (createError) {
        setLoadError(createError.message);
        return;
      }
      if (created) list = [created];
    }
    setBoards(list);

    const targetId = boardParam ?? list[0]?.id;
    if (targetId) {
      const { data: full, error: fullError } = await supabase
        .from("boards")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();
      if (fullError) {
        setLoadError(fullError.message);
        return;
      }
      if (full) {
        setBoard(full);
        if (boardParam && !list.some((b) => b.id === full.id)) {
          setBoards((bs) => [{ id: full.id, title: full.title }, ...bs]);
        }
      } else {
        setLoadError("This board doesn't exist or you don't have access to it.");
      }
    }
  }, [supabase, boardParam]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectBoard(id: string) {
    setSwitcherOpen(false);
    if (id === board?.id) return;
    setBoard(null);
    const { data } = await supabase.from("boards").select("*").eq("id", id).single();
    if (data) setBoard(data);
  }

  async function createBoard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("boards")
      .insert({ user_id: user.id, title: `Board ${boards.length + 1}` })
      .select("*")
      .single();
    if (data) {
      setBoards((b) => [{ id: data.id, title: data.title }, ...b]);
      setBoard(data);
      setSwitcherOpen(false);
    }
  }

  async function saveTitle() {
    if (!board) return;
    const title = titleDraft.trim() || board.title;
    setBoard({ ...board, title });
    setBoards((bs) => bs.map((b) => (b.id === board.id ? { ...b, title } : b)));
    setRenaming(false);
    await supabase.from("boards").update({ title }).eq("id", board.id);
  }

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      {/* Canvas column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-soft bg-card z-10">
          <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
          <div className="relative">
            {renaming ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                className="text-sm font-semibold bg-surface-low border border-outline-soft rounded px-2 py-1 outline-none focus:border-primary"
              />
            ) : (
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                onDoubleClick={() => {
                  setTitleDraft(board?.title ?? "");
                  setRenaming(true);
                  setSwitcherOpen(false);
                }}
                className="btn-press flex items-center gap-1 text-sm font-semibold hover:bg-surface-low rounded-md px-2 py-1"
                title="Click to switch boards, double-click to rename"
              >
                {board?.title ?? "…"}
                <span className="material-symbols-outlined text-[16px] text-ink-soft">
                  expand_more
                </span>
              </button>
            )}
            {switcherOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-outline-soft rounded-lg shadow-lg py-1 w-56 z-50">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => selectBoard(b.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-surface-low truncate ${
                      b.id === board?.id ? "text-primary font-semibold" : ""
                    }`}
                  >
                    {b.title}
                  </button>
                ))}
                <button
                  onClick={createBoard}
                  className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-low flex items-center gap-1.5 border-t border-outline-soft mt-1 pt-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  New board
                </button>
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSharing(true)}
              className="btn-press flex items-center gap-1.5 border border-outline-soft px-3 py-1.5 rounded-lg text-sm hover:bg-surface-low"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              Share
            </button>
            <button
              onClick={() => setChatPanelOpen(!chatPanelOpen)}
              className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                chatPanelOpen
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-outline-soft hover:bg-surface-low"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">forum</span>
              Chats
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          {board ? (
            <BoardCanvas boardId={board.id} initialData={board.board_data} />
          ) : loadError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="material-symbols-outlined text-[40px] text-tier-red">error</span>
              <p className="text-sm text-ink-soft max-w-md">
                Couldn&apos;t load the board: {loadError}
              </p>
              <button
                onClick={load}
                className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-soft text-sm">
              Loading board…
            </div>
          )}
        </div>
      </div>

      {/* Right panel: last 5 chats or open chat */}
      {chatPanelOpen && (
        <aside className="w-[340px] xl:w-[400px] border-l border-outline-soft bg-card flex flex-col shrink-0">
          {openChatId ? (
            <>
              <button
                onClick={() => setOpenChatId(null)}
                className="btn-press flex items-center gap-1.5 px-3 py-2 text-sm text-ink-soft hover:text-ink border-b border-outline-soft"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to recent chats
              </button>
              <div className="flex-1 min-h-0">
                <ChatPanel
                  chatId={openChatId === "new" ? null : openChatId}
                  compact
                  onChatCreated={(id) => setOpenChatId(id)}
                />
              </div>
            </>
          ) : (
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ink mb-1">Recent chats</h3>
              {chats.length === 0 && (
                <p className="text-xs text-ink-soft">
                  No chats yet.{" "}
                  <Link href="/chat?new=1" className="text-primary hover:underline">
                    Start one
                  </Link>
                  .
                </p>
              )}
              {chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setOpenChatId(c.id)}
                  className="btn-press text-left bg-surface border border-outline-soft rounded-lg px-3 py-2.5 text-sm hover:border-primary hover:text-primary transition-colors truncate"
                >
                  {c.title}
                </button>
              ))}
              <button
                onClick={() => setOpenChatId("new")}
                className="btn-press mt-1 flex items-center justify-center gap-1.5 border border-dashed border-outline-soft rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:text-primary hover:border-primary"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New chat here
              </button>
            </div>
          )}
        </aside>
      )}

      {sharing && board && (
        <ShareModal kind="board" resourceId={board.id} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}

export default function BrainstormPage() {
  return (
    <Suspense>
      <BrainstormInner />
    </Suspense>
  );
}
