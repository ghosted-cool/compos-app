"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import type { Priority, Task } from "@/lib/types";

const TIERS: { key: Priority; labelKey: string; dot: string; text: string; ring: string }[] = [
  { key: "red", labelKey: "tasks.critical", dot: "bg-tier-red", text: "text-tier-red", ring: "ring-tier-red" },
  { key: "amber", labelKey: "tasks.important", dot: "bg-tier-amber", text: "text-tier-amber", ring: "ring-tier-amber" },
  { key: "green", labelKey: "tasks.steady", dot: "bg-tier-green", text: "text-tier-green", ring: "ring-tier-green" },
];

export default function TaskBoard({
  projectId = null,
  canEdit = true,
}: {
  projectId?: string | null;
  canEdit?: boolean;
}) {
  const supabase = createClient();
  const { t: tr } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("green");
  const [dueDate, setDueDate] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      query = query.eq("user_id", user.id);
    }
    const { data } = await query;
    if (data) setTasks(data);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setTitle("");
    const { data } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: t,
        priority,
        due_date: dueDate || null,
      })
      .select()
      .single();
    if (data) setTasks((prev) => [data, ...prev]);
    setDueDate("");
  }

  async function toggle(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id);
  }

  async function remove(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await supabase.from("tasks").delete().eq("id", task.id);
  }

  async function changePriority(task: Task, p: Priority) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: p } : t)));
    await supabase.from("tasks").update({ priority: p }).eq("id", task.id);
  }

  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      {canEdit && (
        <form
          onSubmit={addTask}
          className="flex flex-wrap items-center gap-2 bg-card border border-outline-soft rounded-xl p-3"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tr("tasks.addTask")}
            className="flex-1 min-w-[180px] px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary transition-colors"
          />
          <div className="flex items-center gap-1 bg-surface rounded-lg border border-outline-soft p-1">
            {TIERS.map((tier) => (
              <button
                key={tier.key}
                type="button"
                onClick={() => setPriority(tier.key)}
                title={tr(tier.labelKey)}
                className={`btn-press w-7 h-7 rounded-md flex items-center justify-center ${
                  priority === tier.key ? "bg-surface-high ring-1 ring-outline-soft" : ""
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${tier.dot}`} />
              </button>
            ))}
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-2 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary text-ink-soft"
          />
          <button
            type="submit"
            className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            {tr("common.add")}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-soft">{tr("common.loading")}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const tierTasks = open.filter((t) => t.priority === tier.key);
            return (
              <section
                key={tier.key}
                className="bg-card border border-outline-soft rounded-xl p-4 min-h-[160px]"
              >
                <header className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${tier.dot}`} />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${tier.text}`}>
                    {tr(tier.labelKey)}
                  </h3>
                  <span className="ml-auto text-xs text-ink-soft bg-surface-low rounded-full px-2 py-0.5">
                    {tierTasks.length}
                  </span>
                </header>
                <ul className="space-y-2">
                  {tierTasks.map((task) => (
                    <li
                      key={task.id}
                      className="group flex items-start gap-2.5 bg-surface rounded-lg px-3 py-2 border border-transparent hover:border-outline-soft transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggle(task)}
                        disabled={!canEdit}
                        className="btn-press mt-0.5 w-4 h-4 accent-[#0052cc] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink break-words">{task.title}</p>
                        {task.due_date && (
                          <p
                            className={`text-xs mt-0.5 ${
                              task.due_date < new Date().toISOString().slice(0, 10)
                                ? "text-tier-red"
                                : "text-ink-soft"
                            }`}
                          >
                            {tr("tasks.due", { date: task.due_date })}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="hidden group-hover:flex items-center gap-1">
                          {TIERS.filter((t2) => t2.key !== task.priority).map((t2) => (
                            <button
                              key={t2.key}
                              onClick={() => changePriority(task, t2.key)}
                              title={tr("tasks.moveTo", { tier: tr(t2.labelKey) })}
                              className="btn-press w-5 h-5 rounded flex items-center justify-center hover:bg-surface-high"
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${t2.dot}`} />
                            </button>
                          ))}
                          <button
                            onClick={() => remove(task)}
                            className="btn-press text-ink-soft hover:text-tier-red"
                            title={tr("common.delete")}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                  {tierTasks.length === 0 && (
                    <li className="text-xs text-ink-soft px-1 py-2">{tr("tasks.nothingHere")}</li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <section>
          <button
            onClick={() => setShowDone(!showDone)}
            className="btn-press flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showDone ? "expand_less" : "expand_more"}
            </span>
            {tr("tasks.completed", { count: done.length })}
          </button>
          {showDone && (
            <ul className="space-y-1.5">
              {done.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2.5 bg-surface-low rounded-lg px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggle(task)}
                    disabled={!canEdit}
                    className="btn-press w-4 h-4 accent-[#0052cc] cursor-pointer"
                  />
                  <span className="text-sm text-ink-soft line-through flex-1 truncate">
                    {task.title}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => remove(task)}
                      className="btn-press text-ink-soft hover:text-tier-red"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
