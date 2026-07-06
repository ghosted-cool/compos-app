import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { PENDING_LANGUAGE_KEY } from "@/lib/languages";

/**
 * Loads the current user's profile row, creating it if the auth trigger never
 * ran (users who signed up before the schema existed). Also syncs a language
 * chosen on the login screen (stashed in localStorage across the OAuth
 * redirect) into the profile.
 */
export async function ensureProfile(
  supabase: SupabaseClient
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const { data: created, error } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email ?? "",
        name: meta.full_name ?? meta.name ?? null,
        avatar_url: meta.avatar_url ?? null,
      })
      .select("*")
      .single();
    if (error) {
      console.error("Could not create profile row", error);
      return null;
    }
    profile = created;
  }

  // Apply the language picked on the login screen, if any.
  if (typeof window !== "undefined") {
    const pending = window.localStorage.getItem(PENDING_LANGUAGE_KEY);
    if (pending && pending !== profile.language) {
      const { error } = await supabase
        .from("users")
        .update({ language: pending })
        .eq("id", user.id);
      if (!error) profile.language = pending;
    }
    if (pending) window.localStorage.removeItem(PENDING_LANGUAGE_KEY);
  }

  return profile as Profile;
}
