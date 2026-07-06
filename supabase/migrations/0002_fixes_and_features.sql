-- Compos migration 0002 — bug fixes + settings, language, currency, planned costs
-- Run this in the Supabase SQL Editor AFTER 0001_init.sql.

-- ---------------------------------------------------------------------------
-- 1. Backfill missing profile rows.
--    Users who signed in BEFORE 0001 ran never got a public.users row (the
--    trigger didn't exist yet), so every insert with a FK to users — projects,
--    boards, calendar_tokens, expenses — failed silently. This repairs them.
-- ---------------------------------------------------------------------------
insert into public.users (id, email, name, avatar_url)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name'),
  au.raw_user_meta_data ->> 'avatar_url'
from auth.users au
on conflict (id) do nothing;

-- Safety net: a logged-in user may create their own profile row if the trigger
-- ever misses (the app calls this on load when the row is absent).
create policy "users_insert_own" on public.users
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Language preference (ISO 639-1 code, chosen at login or in Settings)
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists language text not null default 'en';

-- ---------------------------------------------------------------------------
-- 3. Budget currency (ISO 4217 code, one per budget row; the app keeps all of
--    a user's rows on the same currency)
-- ---------------------------------------------------------------------------
alter table public.budgets add column if not exists currency text not null default 'USD';

-- ---------------------------------------------------------------------------
-- 4. Planned costs / upcoming payments
-- ---------------------------------------------------------------------------
create table if not exists public.planned_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  created_at timestamptz not null default now()
);

alter table public.planned_costs enable row level security;
create policy "planned_costs_all" on public.planned_costs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists planned_costs_user_due_idx
  on public.planned_costs (user_id, due_date);

-- ---------------------------------------------------------------------------
-- 5. Avatar uploads: public bucket, each user writes only inside their own
--    <user_id>/ folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
