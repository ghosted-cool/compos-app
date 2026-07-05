"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Chat, Profile, Task } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/projects", label: "Projects", icon: "folder_open" },
  { href: "/brainstorm", label: "Brainstorm", icon: "lightbulb" },
  { href: "/calendar", label: "Calendar", icon: "calendar_today" },
  { href: "/budget", label: "Budget", icon: "payments" },
  { href: "/tasks", label: "Tasks", icon: "check_circle" },
];

export default function Sidebar() {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chats, setChats] = useState<Pick<Chat, "id" | "title" | "updated_at">[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [search, setSearch] = useState("");
  const [editingTagline, setEditingTagline] = useState(false);
  const [taglineDraft, setTaglineDraft] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, tasksRes, chatsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(7),
      supabase
        .from("chats")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (chatsRes.data) setChats(chatsRes.data);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load, pathname]);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const title = newTodo.trim();
    if (!title || !profile) return;
    setNewTodo("");
    const { data } = await supabase
      .from("tasks")
      .insert({ user_id: profile.id, title, priority: "green" })
      .select()
      .single();
    if (data) setTasks((t) => [data, ...t].slice(0, 7));
  }

  async function toggleTodo(task: Task) {
    setTasks((t) => t.filter((x) => x.id !== task.id));
    await supabase.from("tasks").update({ completed: true }).eq("id", task.id);
  }

  async function saveTagline() {
    if (!profile) return;
    const tagline = taglineDraft.trim() || profile.tagline;
    setProfile({ ...profile, tagline });
    setEditingTagline(false);
    await supabase.from("users").update({ tagline }).eq("id", profile.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const firstName =
    profile?.name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "";

  const content = (
    <>
      {/* Header: logo + name + tagline */}
      <div className="mb-5 mt-1 px-2 flex items-start gap-3">
        <Image
          src="/logo.png"
          alt="Compos"
          width={36}
          height={36}
          className="object-contain mt-0.5"
        />
        <div className="min-w-0">
          <h2 className="font-semibold text-primary text-base leading-tight truncate">
            {firstName ? `${firstName}'s Domain` : "Compos"}
          </h2>
          {editingTagline ? (
            <input
              autoFocus
              value={taglineDraft}
              onChange={(e) => setTaglineDraft(e.target.value)}
              onBlur={saveTagline}
              onKeyDown={(e) => e.key === "Enter" && saveTagline()}
              className="text-xs text-ink-soft bg-surface-low rounded px-1 py-0.5 w-full outline-none border border-outline-soft focus:border-primary"
            />
          ) : (
            <button
              onClick={() => {
                setTaglineDraft(profile?.tagline ?? "");
                setEditingTagline(true);
              }}
              className="text-xs text-ink-soft text-left hover:text-ink transition-colors"
              title="Click to edit tagline"
            >
              {profile?.tagline ?? "…"}
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-0.5 mb-5">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`btn-press flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm ${
                active
                  ? "text-primary font-semibold bg-primary/10"
                  : "text-ink-soft hover:bg-surface-high"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${active ? "filled" : ""}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Quick-add To Do */}
      <div className="mb-5">
        <div className="bg-surface-highest px-3 py-1 rounded-sm text-center mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">To Do</h3>
        </div>
        <form onSubmit={addTodo} className="px-1 mb-2">
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a to-do…"
            className="w-full text-sm px-2 py-1.5 bg-card border border-outline-soft rounded-md outline-none focus:border-primary transition-colors"
          />
        </form>
        <ul className="space-y-1.5 px-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2.5 border-b border-surface-high pb-1"
            >
              <input
                type="checkbox"
                onChange={() => toggleTodo(task)}
                className="btn-press w-4 h-4 rounded-sm border-outline-soft text-primary accent-[#0052cc] cursor-pointer"
              />
              <span
                className={`text-sm truncate flex-1 ${
                  task.priority === "red"
                    ? "text-tier-red"
                    : task.priority === "amber"
                      ? "text-tier-amber"
                      : "text-ink"
                }`}
              >
                {task.title}
              </span>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="text-xs text-ink-soft px-1">All clear ✨</li>
          )}
        </ul>
      </div>

      {/* Chats */}
      <div className="bg-card p-3 rounded-lg border border-outline-soft mb-3 flex-1 min-h-0 flex flex-col">
        <h3 className="text-sm font-bold text-ink mb-2 px-1">Chats</h3>
        <div className="relative mb-2">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-ink-soft text-[16px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-7 pr-2 py-1 bg-surface border border-outline-soft rounded-md text-xs outline-none focus:border-primary transition-colors"
          />
        </div>
        <ul className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1">
          {filteredChats.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat?id=${c.id}`}
                onClick={() => setMobileOpen(false)}
                className="block text-xs text-ink-soft hover:text-ink truncate px-1 transition-colors"
              >
                {c.title}
              </Link>
            </li>
          ))}
          {filteredChats.length === 0 && (
            <li className="text-xs text-ink-soft px-1">No chats yet</li>
          )}
        </ul>
        <Link
          href="/chat?new=1"
          onClick={() => setMobileOpen(false)}
          className="btn-press mt-2 flex items-center justify-center gap-2 w-full py-1.5 bg-surface border border-outline-soft text-ink rounded-lg hover:bg-surface-low text-sm font-medium"
        >
          <span className="material-symbols-outlined text-[16px]">edit_square</span>
          New Chat
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-surface-high pt-2">
        <button
          onClick={signOut}
          className="btn-press flex items-center gap-3 px-3 py-1.5 w-full text-ink-soft rounded-lg hover:bg-surface-high text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between w-full px-4 h-14 bg-card border-b border-outline-soft fixed top-0 left-0 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn-press flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-primary">menu</span>
          <Image src="/logo.png" alt="Compos" width={28} height={28} className="object-contain" />
        </button>
        <span className="text-sm font-semibold text-primary">Compos</span>
      </header>
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } md:flex flex-col p-4 bg-card border-r border-outline-soft fixed left-0 top-0 h-full w-[280px] z-50 overflow-y-auto custom-scrollbar pt-16 md:pt-4`}
      >
        {content}
      </aside>
      {/* Mobile content offset */}
      <div className="md:hidden h-14" />
    </>
  );
}
