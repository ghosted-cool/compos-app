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
      const { provider_token, provider_refresh_token, user } = data.session;
      try {
        const admin = createAdminClient();

        // Guarantee the profile row exists before anything references it.
        // (The auth trigger misses users created before the schema ran, and
        // calendar_tokens has a FK to public.users.)
        const meta = (user.user_metadata ?? {}) as Record<string, string>;
        await admin.from("users").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            name: meta.full_name ?? meta.name ?? null,
            avatar_url: meta.avatar_url ?? null,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

        // Google returns provider tokens on this exchange; persist them
        // (encrypted) so the Calendar integration can read/write events later.
        if (provider_token) {
          const row: Record<string, string> = {
            user_id: user.id,
            access_token: encrypt(provider_token),
            expiry: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (provider_refresh_token) {
            row.refresh_token = encrypt(provider_refresh_token);
          }
          const { error: tokenError } = await admin
            .from("calendar_tokens")
            .upsert(row);
          if (tokenError) {
            console.error("Failed to store calendar tokens", tokenError);
          }
        }
      } catch (e) {
        console.error("Post-login setup failed", e);
      }
      const safeNext = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    console.error("exchangeCodeForSession failed", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
