-- Compos migration 0002 — bug fixes + settings, language, currency, planned costs
-- Run this in the Supabase SQL Editor AFTER 0001_init.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Backfill missing profile rows (accounts created before 0001 ran never got
--    a public.users row, breaking every insert with a FK to users)
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
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Language preference (ISO 639-1 code, chosen at login or in Settings)
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists language text not null default 'en';

-- ---------------------------------------------------------------------------
-- 3. Budget currency (ISO 4217 code; the app keeps all of a user's budget rows
--    on the same currency)
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
drop policy if exists "planned_costs_all" on public.planned_costs;
create policy "planned_costs_all" on public.planned_costs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists planned_costs_user_due_idx
  on public.planned_costs (user_id, due_date);

-- ---------------------------------------------------------------------------
-- 5. Fix INSERT ... RETURNING on projects and boards.
--
--    The 0001 select policies called can_view_project(id) / can_view_board(id),
--    which look the row up in its own table. During INSERT ... RETURNING the
--    new row is not yet visible to that lookup, so PostgREST's
--    return=representation failed with "new row violates row-level security
--    policy" — this is what broke creating projects and boards from the app.
--
--    Fix: check ownership inline on the row itself and use security-definer
--    helpers only for the share lookups (which query the *shares* tables, so
--    there is no self-reference and no RLS recursion).
-- ---------------------------------------------------------------------------
create or replace function public.has_project_share(p_project_id uuid, p_need_edit boolean)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from project_shares s
    where s.project_id = p_project_id
      and s.shared_with = public.jwt_email()
      and (not p_need_edit or s.permission = 'edit')
  );
$$;

create or replace function public.has_board_share(p_board_id uuid, p_need_edit boolean)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from board_shares s
    where s.board_id = p_board_id
      and s.shared_with = public.jwt_email()
      and (not p_need_edit or s.permission = 'edit')
  );
$$;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (owner_id = auth.uid() or public.has_project_share(id, false));

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update using (owner_id = auth.uid() or public.has_project_share(id, true));

drop policy if exists "boards_select" on public.boards;
create policy "boards_select" on public.boards
  for select using (user_id = auth.uid() or public.has_board_share(id, false));

drop policy if exists "boards_update" on public.boards;
create policy "boards_update" on public.boards
  for update using (user_id = auth.uid() or public.has_board_share(id, true));

-- Note: can_view_project / can_edit_project remain in use by the tasks
-- policies, where they check a *different* row (the task's project) and work
-- correctly.

-- Note: avatars are stored as small data URLs in users.avatar_url — no storage
-- bucket is required. (Storage policies can't be created from the SQL editor
-- on current Supabase projects; that statement is what rolled back the
-- previous version of this migration.)
