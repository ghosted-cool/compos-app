-- Compos migration 0003 — project cascade deletes, project boards, workspace label
-- Run in the Supabase SQL Editor AFTER 0002. Safe to re-run.

-- Deleting a project now deletes its tasks and boards (previously they were
-- kept with project_id set to null). The app also deletes them explicitly, so
-- this is defense in depth.
alter table public.tasks drop constraint if exists tasks_project_id_fkey;
alter table public.tasks
  add constraint tasks_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete cascade;

alter table public.boards drop constraint if exists boards_project_id_fkey;
alter table public.boards
  add constraint boards_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete cascade;

-- A project can have at most one attached board.
create unique index if not exists boards_project_unique
  on public.boards (project_id) where project_id is not null;

-- Editable second half of the sidebar workspace title ("Gabriele's <label>").
alter table public.users
  add column if not exists workspace_label text not null default 'Domain';
alter table public.users drop constraint if exists users_workspace_label_len;
alter table public.users
  add constraint users_workspace_label_len check (char_length(workspace_label) <= 25);
