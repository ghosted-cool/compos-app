"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import type { GoogleEvent } from "@/lib/google";

const WEEKDAY_KEYS = [
  "calendar.mon",
  "calendar.tue",
  "calendar.wed",
  "calendar.thu",
  "calendar.fri",
  "calendar.sat",
  "calendar.sun",
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const supabase = createClient();
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notConnected, setNotConnected] = useState(false);
  const [apiDisabled, setApiDisabled] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [startTime, setStartTime] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const locale = i18n.language;

  const monthStart = useMemo(() => new Date(cursor), [cursor]);
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    [cursor]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setNotConnected(false);
    setApiDisabled(false);
    setLoadError(false);

    const timeMin = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1 - 7
    ).toISOString();
    const timeMax = new Date(
      monthEnd.getFullYear(),
      monthEnd.getMonth(),
      monthEnd.getDate() + 7
    ).toISOString();

    try {
      const [evRes, taskRes] = await Promise.all([
        fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`),
        supabase
          .from("tasks")
          .select("*")
          .not("due_date", "is", null)
          .gte("due_date", ymd(monthStart))
          .lte("due_date", ymd(monthEnd)),
      ]);

      if (evRes.status === 401) {
        setNotConnected(true);
        setEvents([]);
      } else if (evRes.ok) {
        const data = await evRes.json();
        setEvents(data.events ?? []);
      } else {
        const data = await evRes.json().catch(() => null);
        if (data?.error === "calendar_api_disabled") {
          setApiDisabled(true);
        } else {
          setLoadError(true);
        }
        setEvents([]);
      }
      if (taskRes.data) setTasks(taskRes.data);
    } catch (e) {
      console.error("Calendar load failed", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [supabase, monthStart, monthEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, GoogleEvent[]>();
    for (const e of events) {
      const day = e.start?.date ?? e.start?.dateTime?.slice(0, 10);
      if (!day) continue;
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      map.set(t.due_date, [...(map.get(t.due_date) ?? []), t]);
    }
    return map;
  }, [tasks]);

  // Build the month grid (weeks starting Monday)
  const cells = useMemo(() => {
    const firstWeekday = (monthStart.getDay() + 6) % 7; // Mon=0
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor, monthStart, monthEnd]);

  const today = ymd(new Date());

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim() || !addDate) return;
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        date: addDate,
        startTime: startTime || undefined,
      }),
    });
    if (res.ok) {
      setSummary("");
      setStartTime("");
      setAddDate(null);
      load();
    } else if (res.status === 401) {
      setNotConnected(true);
      setAddDate(null);
    }
  }

  async function removeEvent(id: string) {
    setEvents((ev) => ev.filter((e) => e.id !== id));
    await fetch(`/api/calendar/events?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  const monthLabel = cursor.toLocaleString(locale, { month: "long", year: "numeric" });
  const dayDetail = selectedDay
    ? {
        events: eventsByDay.get(selectedDay) ?? [],
        tasks: tasksByDay.get(selectedDay) ?? [],
      }
    : null;

  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-6xl w-full mx-auto">
      <header className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("calendar.title")}</h1>
          <p className="text-sm text-ink-soft mt-1">{t("calendar.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="btn-press w-9 h-9 rounded-lg border border-outline-soft bg-card flex items-center justify-center hover:bg-surface-low"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <span className="text-sm font-semibold w-40 text-center">{monthLabel}</span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="btn-press w-9 h-9 rounded-lg border border-outline-soft bg-card flex items-center justify-center hover:bg-surface-low"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </header>

      {loadError && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tier-red">
          <span className="material-symbols-outlined">error</span>
          <span>{t("calendar.loadFailed")} </span>
          <button onClick={load} className="btn-press font-semibold underline">
            {t("common.retry")}
          </button>
        </div>
      )}

      {apiDisabled && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-tier-red">
          <span className="material-symbols-outlined">error</span>
          <span>{t("calendar.apiDisabled")} </span>
          <button onClick={load} className="btn-press font-semibold underline">
            {t("common.retry")}
          </button>
        </div>
      )}

      {notConnected && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-tier-amber">
          <span className="material-symbols-outlined">warning</span>
          <span>{t("calendar.notConnected")}</span>
        </div>
      )}

      <div className="bg-card border border-outline-soft rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-outline-soft bg-surface-low">
          {WEEKDAY_KEYS.map((k) => (
            <div key={k} className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-ink-soft text-center">
              {t(k)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-[96px] border-b border-r border-surface-high bg-surface-low/40" />;
            const key = ymd(date);
            const dayEvents = eventsByDay.get(key) ?? [];
            const dayTasks = tasksByDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(key)}
                className={`min-h-[96px] border-b border-r border-surface-high p-1.5 text-left align-top hover:bg-surface-low transition-colors relative group ${
                  isToday ? "bg-primary/5" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                    isToday ? "bg-primary text-white font-bold" : "text-ink-soft"
                  }`}
                >
                  {date.getDate()}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddDate(key);
                  }}
                  className="material-symbols-outlined absolute top-1.5 right-1.5 text-[16px] text-ink-soft opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity cursor-pointer"
                  title={t("calendar.addEvent")}
                >
                  add_circle
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="text-[11px] leading-tight truncate rounded px-1 py-0.5 bg-primary/10 text-primary font-medium"
                    >
                      {e.start?.dateTime
                        ? new Date(e.start.dateTime).toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
                          }) + " "
                        : ""}
                      {e.summary ?? t("calendar.untitled")}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map((t2) => (
                    <div
                      key={t2.id}
                      className={`text-[11px] leading-tight truncate rounded px-1 py-0.5 font-medium ${
                        t2.priority === "red"
                          ? "bg-red-50 text-tier-red"
                          : t2.priority === "amber"
                            ? "bg-amber-50 text-tier-amber"
                            : "bg-green-50 text-tier-green"
                      } ${t2.completed ? "line-through opacity-60" : ""}`}
                    >
                      ● {t2.title}
                    </div>
                  ))}
                  {dayEvents.length + dayTasks.length > 4 && (
                    <div className="text-[10px] text-ink-soft px-1">
                      {t("calendar.more", { count: dayEvents.length + dayTasks.length - 4 })}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-xs text-ink-soft mt-3">{t("calendar.syncing")}</p>}

      {/* Day detail drawer */}
      {selectedDay && dayDetail && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-card rounded-xl border border-outline-soft shadow-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString(locale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <button
                onClick={() => {
                  setAddDate(selectedDay);
                  setSelectedDay(null);
                }}
                className="btn-press flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                {t("calendar.event")}
              </button>
            </div>
            {dayDetail.events.length === 0 && dayDetail.tasks.length === 0 && (
              <p className="text-sm text-ink-soft">{t("calendar.nothingScheduled")}</p>
            )}
            <div className="space-y-2">
              {dayDetail.events.map((e) => (
                <div
                  key={e.id}
                  className="group flex items-center gap-3 bg-surface rounded-lg px-3 py-2.5"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">event</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {e.summary ?? t("calendar.untitled")}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {e.start?.dateTime
                        ? new Date(e.start.dateTime).toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : t("calendar.allDay")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEvent(e.id)}
                    className="btn-press opacity-0 group-hover:opacity-100 text-ink-soft hover:text-tier-red"
                    title={t("calendar.deleteFromGoogle")}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
              {dayDetail.tasks.map((t2) => (
                <div key={t2.id} className="flex items-center gap-3 bg-surface rounded-lg px-3 py-2.5">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      t2.priority === "red"
                        ? "bg-tier-red"
                        : t2.priority === "amber"
                          ? "bg-tier-amber"
                          : "bg-tier-green"
                    }`}
                  />
                  <p className={`text-sm flex-1 truncate ${t2.completed ? "line-through text-ink-soft" : ""}`}>
                    {t2.title}
                  </p>
                  <span className="text-xs text-ink-soft">{t("calendar.task")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add event modal */}
      {addDate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={() => setAddDate(null)}
        >
          <form
            onSubmit={addEvent}
            className="bg-card rounded-xl border border-outline-soft shadow-xl w-full max-w-sm p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {t("calendar.newEvent")} ·{" "}
              {new Date(addDate + "T00:00:00").toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              })}
            </h2>
            <input
              autoFocus
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("calendar.eventTitle")}
              className="w-full px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary"
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-3 py-2 text-sm bg-surface border border-outline-soft rounded-lg outline-none focus:border-primary text-ink-soft"
              />
              <span className="text-xs text-ink-soft">{t("calendar.allDayHint")}</span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddDate(null)}
                className="btn-press px-4 py-2 rounded-lg text-sm text-ink-soft hover:bg-surface-low"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="btn-press bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                {t("calendar.addToGoogle")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
