import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Google returns provider tokens on this exchange; persist them (encrypted)
      // so the Calendar integration can read/write events later.
      const { provider_token, provider_refresh_token, user } = data.session;
      if (provider_token) {
        try {
          const admin = createAdminClient();
          const row: Record<string, string> = {
            user_id: user.id,
            access_token: encrypt(provider_token),
            expiry: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (provider_refresh_token) {
            row.refresh_token = encrypt(provider_refresh_token);
          }
          await admin.from("calendar_tokens").upsert(row);
        } catch (e) {
          console.error("Failed to store calendar tokens", e);
        }
      }
      const safeNext = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
