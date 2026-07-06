# Compos — Setup Checklist

The code is complete and builds. These steps need the Supabase / Google dashboards, which only you can access.

## 1. Create the database schema (required — nothing works without it)
1. Open the Supabase dashboard → your Compos project → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` and click **Run**.
   It creates all 11 tables, row-level security, the profile trigger, the chat rate-limit
   function, and the share-redemption function.
3. Then run `supabase/migrations/0002_fixes_and_features.sql` the same way. **This one is
   required even if 0001 was already run, and it is safe to re-run** — it fixes the
   row-level-security policies that made creating projects and Brainstorm boards fail
   ("new row violates row-level security policy"), repairs profile rows for accounts
   created before 0001 existed, and adds the language preference, budget currency, and
   planned costs. No storage bucket is needed — avatars are stored on the profile row.

## 2. Enable Google auth in Supabase
1. Supabase dashboard → **Authentication → Providers → Google** → enable.
2. Enter the OAuth **Client ID** (`106788605190-qd3ipqlkc322crsr779fpv7kkouvj0ds.apps.googleusercontent.com`)
   and the **Client Secret** from Google Cloud Console.
3. In Google Cloud Console → Credentials → your OAuth client, make sure
   `https://tpygdfagnbmbmfteiqqk.supabase.co/auth/v1/callback` is an authorized redirect URI.
4. Supabase → **Authentication → URL Configuration**: set Site URL to `http://localhost:3000`
   for now (later `https://compos.ghosted.cool`), and add
   `http://localhost:3000/auth/callback` to the redirect allow-list.

## 3. (Recommended) Add the Google client secret to the app
Add to `.env.local`:
```
GOOGLE_CLIENT_SECRET=<the same secret you put in Supabase>
```
Without it, calendar access works for ~1 hour after each sign-in; with it, Compos silently
refreshes the Google token using the stored refresh token.

## 4. OAuth consent screen (for Production review)
- App domain / privacy policy URL: `https://compos.ghosted.cool/privacy`
- Terms URL: `https://compos.ghosted.cool/terms`
- Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `.../auth/calendar.events`
Both pages are already live in the app and accurately describe data handling.

## 5. Anthropic spend cap
In the Anthropic Console, set a hard monthly spend cap on the Compos API key (the plan calls
for this in addition to the in-app 10-requests/24h limit).

## 6. Run it
```
npm run dev
```
→ http://localhost:3000 (redirects to /login until you sign in with Google).

## Deploying to Vercel (Phase 3)
Set these env vars in the Vercel project: everything in `.env.example`, with
`NEXT_PUBLIC_SITE_URL=https://compos.ghosted.cool`. Then add the subdomain CNAME in
Squarespace DNS as per the action plan, and update the Supabase Site URL + redirect list.
