import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarAuthError,
  createEvent,
  deleteEvent,
  listEvents,
} from "@/lib/google";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "timeMin and timeMax required" }, { status: 400 });
  }

  try {
    const events = await listEvents(user.id, timeMin, timeMax);
    return NextResponse.json({ events });
  } catch (e) {
    if (e instanceof CalendarAuthError) {
      return NextResponse.json({ error: "calendar_not_connected" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "calendar_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: {
    summary?: string;
    description?: string;
    date?: string; // YYYY-MM-DD
    startTime?: string; // HH:mm (optional → all-day)
    endTime?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const summary = body.summary?.trim();
  if (!summary || !body.date) {
    return NextResponse.json({ error: "summary and date required" }, { status: 400 });
  }

  let start: { date?: string; dateTime?: string };
  let end: { date?: string; dateTime?: string };
  if (body.startTime) {
    const endTime = body.endTime || addHour(body.startTime);
    start = { dateTime: `${body.date}T${body.startTime}:00` };
    end = { dateTime: `${body.date}T${endTime}:00` };
  } else {
    start = { date: body.date };
    end = { date: nextDay(body.date) };
  }

  try {
    const event = await createEvent(user.id, {
      summary,
      description: body.description,
      start,
      end,
    });
    return NextResponse.json({ event });
  } catch (e) {
    if (e instanceof CalendarAuthError) {
      return NextResponse.json({ error: "calendar_not_connected" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "calendar_error" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await deleteEvent(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CalendarAuthError) {
      return NextResponse.json({ error: "calendar_not_connected" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "calendar_error" }, { status: 502 });
  }
}

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function nextDay(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
