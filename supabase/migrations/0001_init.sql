-- Compos initial schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users: profile row mirroring auth.users
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  tagline text not null default 'Do or do not. There is no try',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(public.users.name, excluded.name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  priority text not null default 'green' check (priority in ('red', 'amber', 'green')),
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chats (messages stored as jsonb array of {role, content})
-- ---------------------------------------------------------------------------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default 'New chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chat_usage: server-side rolling 24h rate limit state
-- ---------------------------------------------------------------------------
create table public.chat_usage (
  user_id uuid primary key references public.users (id) on delete cascade,
  request_count integer not null default 0,
  window_start timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- boards (tldraw document lives in board_data)
-- ---------------------------------------------------------------------------
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null default 'Untitled board',
  board_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- calendar_tokens (values are AES-256-GCM encrypted app-side before storage)
-- ---------------------------------------------------------------------------
create table public.calendar_tokens (
  user_id uuid primary key references public.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- shares
-- ---------------------------------------------------------------------------
create table public.project_shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  shared_with text, -- invited email (lowercased), null for pure link shares
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.board_shares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  shared_with text,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  permission text not null default 'view' check (permission in ('view', 'edit')),
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- expenses & budgets
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'Other',
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  category text, -- null = overall monthly budget
  monthly_limit numeric(12, 2) not null check (monthly_limit >= 0),
  month text not null -- 'YYYY-MM'
);

create unique index budgets_user_month_category_key
  on public.budgets (user_id, month, coalesce(category, ''));

-- ---------------------------------------------------------------------------
-- helper: current user's email from JWT
-- ---------------------------------------------------------------------------
create or replace function public.jwt_email()
returns text
language sql stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.chats enable row level security;
alter table public.chat_usage enable row level security;
alter table public.boards enable row level security;
alter table public.calendar_tokens enable row level security;
alter table public.project_shares enable row level security;
alter table public.board_shares enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;

-- users: read/update own profile
create policy "users_select_own" on public.users
  for select using (id = auth.uid());
create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- share-visibility helpers (security definer avoids recursive RLS)
create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from projects p where p.id = p_project_id and p.owner_id = auth.uid()
  ) or exists (
    select 1 from project_shares s
    where s.project_id = p_project_id and s.shared_with = public.jwt_email()
  );
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from projects p where p.id = p_project_id and p.owner_id = auth.uid()
  ) or exists (
    select 1 from project_shares s
    where s.project_id = p_project_id
      and s.shared_with = public.jwt_email()
      and s.permission = 'edit'
  );
$$;

create or replace function public.can_view_board(p_board_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from boards b where b.id = p_board_id and b.user_id = auth.uid()
  ) or exists (
    select 1 from board_shares s
    where s.board_id = p_board_id and s.shared_with = public.jwt_email()
  );
$$;

create or replace function public.can_edit_board(p_board_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from boards b where b.id = p_board_id and b.user_id = auth.uid()
  ) or exists (
    select 1 from board_shares s
    where s.board_id = p_board_id
      and s.shared_with = public.jwt_email()
      and s.permission = 'edit'
  );
$$;

-- projects: owner full access, shared users view/edit
create policy "projects_select" on public.projects
  for select using (public.can_view_project(id));
create policy "projects_insert" on public.projects
  for insert with check (owner_id = auth.uid());
create policy "projects_update" on public.projects
  for update using (public.can_edit_project(id));
create policy "projects_delete" on public.projects
  for delete using (owner_id = auth.uid());

-- tasks: own tasks + tasks in projects shared with you
create policy "tasks_select" on public.tasks
  for select using (
    user_id = auth.uid()
    or (project_id is not null and public.can_view_project(project_id))
  );
create policy "tasks_insert" on public.tasks
  for insert with check (
    user_id = auth.uid()
    and (project_id is null or public.can_edit_project(project_id))
  );
create policy "tasks_update" on public.tasks
  for update using (
    user_id = auth.uid()
    or (project_id is not null and public.can_edit_project(project_id))
  );
create policy "tasks_delete" on public.tasks
  for delete using (
    user_id = auth.uid()
    or (project_id is not null and public.can_edit_project(project_id))
  );

-- chats: strictly own
create policy "chats_all" on public.chats
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chat_usage: user can read own usage; writes only via security-definer fn / service role
create policy "chat_usage_select_own" on public.chat_usage
  for select using (user_id = auth.uid());

-- boards: owner full access, shared users view/edit
create policy "boards_select" on public.boards
  for select using (public.can_view_board(id));
create policy "boards_insert" on public.boards
  for insert with check (user_id = auth.uid());
create policy "boards_update" on public.boards
  for update using (public.can_edit_board(id));
create policy "boards_delete" on public.boards
  for delete using (user_id = auth.uid());

-- calendar_tokens: no client access at all (service role only)

-- shares: owner of the underlying resource manages; invitee can see their invite
create policy "project_shares_select" on public.project_shares
  for select using (
    created_by = auth.uid()
    or shared_with = public.jwt_email()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "project_shares_insert" on public.project_shares
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );
create policy "project_shares_delete" on public.project_shares
  for delete using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "board_shares_select" on public.board_shares
  for select using (
    created_by = auth.uid()
    or shared_with = public.jwt_email()
    or exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid())
  );
create policy "board_shares_insert" on public.board_shares
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid())
  );
create policy "board_shares_delete" on public.board_shares
  for delete using (
    exists (select 1 from public.boards b where b.id = board_id and b.user_id = auth.uid())
  );

-- expenses & budgets: strictly own
create policy "expenses_all" on public.expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_all" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Chat rate limiting: 10 requests / rolling 24h window, atomic consume.
-- Called ONLY from the server route via service role. Not executable by clients.
-- ---------------------------------------------------------------------------
create or replace function public.consume_chat_request(p_user_id uuid)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  u record;
begin
  insert into chat_usage (user_id, request_count, window_start)
  values (p_user_id, 0, now())
  on conflict (user_id) do nothing;

  select * into u from chat_usage where user_id = p_user_id for update;

  if u.window_start < now() - interval '24 hours' then
    update chat_usage set request_count = 0, window_start = now()
    where user_id = p_user_id;
    u.request_count := 0;
    u.window_start := now();
  end if;

  if u.request_count >= 10 then
    return query select false, 0, u.window_start + interval '24 hours';
  else
    update chat_usage set request_count = u.request_count + 1
    where user_id = p_user_id;
    return query
      select true, 10 - (u.request_count + 1), u.window_start + interval '24 hours';
  end if;
end;
$$;

-- Read-only view of usage (no increment), safe for authenticated users
create or replace function public.get_chat_usage()
returns table (remaining integer, reset_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  u record;
begin
  select * into u from chat_usage where user_id = auth.uid();
  if u is null or u.window_start < now() - interval '24 hours' then
    return query select 10, now() + interval '24 hours';
  else
    return query
      select greatest(0, 10 - u.request_count), u.window_start + interval '24 hours';
  end if;
end;
$$;

revoke execute on function public.consume_chat_request(uuid) from public, anon, authenticated;
grant execute on function public.get_chat_usage() to authenticated;

-- ---------------------------------------------------------------------------
-- Share redemption: logged-in user opens a share link; grants them email-based
-- access by attaching their email to the share row (idempotent).
-- ---------------------------------------------------------------------------
create or replace function public.redeem_share(p_token text)
returns table (kind text, resource_id uuid, permission text)
language plpgsql
security definer set search_path = public
as $$
declare
  ps record;
  bs record;
begin
  select * into ps from project_shares where share_token = p_token;
  if ps.id is not null then
    if ps.shared_with is null then
      -- open link: grant this user's email access at the link's permission
      insert into project_shares (project_id, shared_with, permission, created_by)
      values (ps.project_id, public.jwt_email(), ps.permission, ps.created_by)
      on conflict do nothing;
    end if;
    return query select 'project'::text, ps.project_id, ps.permission;
    return;
  end if;

  select * into bs from board_shares where share_token = p_token;
  if bs.id is not null then
    if bs.shared_with is null then
      insert into board_shares (board_id, shared_with, permission, created_by)
      values (bs.board_id, public.jwt_email(), bs.permission, bs.created_by)
      on conflict do nothing;
    end if;
    return query select 'board'::text, bs.board_id, bs.permission;
    return;
  end if;

  return; -- empty result = invalid token
end;
$$;

grant execute on function public.redeem_share(text) to authenticated;

-- Avoid duplicate email grants
create unique index project_shares_project_email_key
  on public.project_shares (project_id, shared_with) where shared_with is not null;
create unique index board_shares_board_email_key
  on public.board_shares (board_id, shared_with) where shared_with is not null;

-- helpful indexes
create index tasks_user_idx on public.tasks (user_id, completed, priority);
create index tasks_project_idx on public.tasks (project_id);
create index chats_user_idx on public.chats (user_id, updated_at desc);
create index expenses_user_date_idx on public.expenses (user_id, date desc);
create index boards_user_idx on public.boards (user_id, updated_at desc);
