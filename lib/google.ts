import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export class CalendarAuthError extends Error {
  constructor(message = "Google Calendar is not connected") {
    super(message);
    this.name = "CalendarAuthError";
  }
}

export class CalendarApiDisabledError extends Error {
  constructor(message = "Google Calendar API is disabled in the Google Cloud project") {
    super(message);
    this.name = "CalendarApiDisabledError";
  }
}

/**
 * Reads a failed Google Calendar response body, logs it, and throws the most
 * specific error: API-disabled 403 (project-level), auth failure (401/other
 * 403), or a generic error with the status.
 */
async function throwCalendarError(res: Response, op: string): Promise<never> {
  const body = await res.text().catch(() => "");
  console.error(`Google Calendar ${op} failed`, res.status, body);
  if (
    res.status === 403 &&
    (body.includes("accessNotConfigured") || body.includes("has not been used in project"))
  ) {
    throw new CalendarApiDisabledError();
  }
  if (res.status === 401 || res.status === 403) throw new CalendarAuthError();
  throw new Error(`Google Calendar ${op} failed: ${res.status}`);
}

/**
 * Returns a valid Google access token for the user, refreshing it with the
 * stored refresh token when expired. Requires GOOGLE_CLIENT_SECRET for
 * refreshes; without it the token from the latest sign-in is used as-is.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) throw new CalendarAuthError();

  let accessToken: string;
  try {
    accessToken = decrypt(row.access_token);
  } catch {
    // Token encrypted with a different TOKEN_ENCRYPTION_KEY (e.g. local vs
    // deploy) — treat as not connected so the user just re-signs in.
    await admin.from("calendar_tokens").delete().eq("user_id", userId);
    throw new CalendarAuthError();
  }
  const expiresSoon =
    !row.expiry || new Date(row.expiry).getTime() < Date.now() + 2 * 60 * 1000;

  if (!expiresSoon) return accessToken;

  // Try to refresh
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!row.refresh_token || !clientId || !clientSecret) {
    // Can't refresh — return the current token and let Google reject it if stale.
    return accessToken;
  }

  let refreshToken: string;
  try {
    refreshToken = decrypt(row.refresh_token);
  } catch {
    return accessToken;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Google token refresh failed", res.status, body);
    if (body.includes("invalid_grant")) {
      // Refresh token was revoked — clear it so the next sign-in stores a fresh one.
      await admin.from("calendar_tokens").delete().eq("user_id", userId);
    }
    throw new CalendarAuthError("Google session expired — please sign in again");
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  await admin
    .from("calendar_tokens")
    .update({
      access_token: encrypt(data.access_token),
      expiry: new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return data.access_token;
}

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

export async function listEvents(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const token = await getAccessToken(userId);
  const url = new URL(`${CALENDAR_API}/calendars/primary/events`);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) await throwCalendarError(res, "list");
  const data = await res.json();
  return data.items ?? [];
}

export async function createEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: { date?: string; dateTime?: string };
    end: { date?: string; dateTime?: string };
  }
): Promise<GoogleEvent> {
  const token = await getAccessToken(userId);
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) await throwCalendarError(res, "insert");
  return res.json();
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const token = await getAccessToken(userId);
  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 410) {
    await throwCalendarError(res, "delete");
  }
}
