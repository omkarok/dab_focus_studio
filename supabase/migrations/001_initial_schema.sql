-- ============================================================
-- AI Consulting Studio — Initial Database Schema
-- ============================================================
-- Users are handled by Supabase Auth (auth.users).
-- This migration creates the application tables, RLS policies,
-- and indexes required for the task management app.
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text not null,
  color text not null default '#6366f1',
  owner_id uuid references auth.users(id) not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Project members (for collaboration)
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer', -- 'owner', 'editor', 'viewer'
  invited_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  notes text,
  priority text not null default 'P1',
  status text not null default 'backlog',
  estimate integer,
  tags text[] default '{}',
  due timestamptz,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Templates
create table templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  tasks jsonb not null default '[]',
  columns jsonb not null default '["now","next","later","backlog","done"]',
  is_global boolean default false,
  created_at timestamptz default now()
);

-- Time entries
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration integer not null default 0, -- minutes
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table templates enable row level security;
alter table time_entries enable row level security;

-- ---- Projects ----

create policy "Users can view own projects"
  on projects for select
  using (
    owner_id = auth.uid()
    or id in (select project_id from project_members where user_id = auth.uid())
  );

create policy "Users can insert own projects"
  on projects for insert
  with check (owner_id = auth.uid());

create policy "Owners can update projects"
  on projects for update
  using (owner_id = auth.uid());

create policy "Owners can delete projects"
  on projects for delete
  using (owner_id = auth.uid());

-- ---- Project members ----

create policy "Members can view project membership"
  on project_members for select
  using (
    project_id in (select id from projects where owner_id = auth.uid())
    or user_id = auth.uid()
  );

create policy "Owners can manage members"
  on project_members for insert
  with check (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Owners can update members"
  on project_members for update
  using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

create policy "Owners can remove members"
  on project_members for delete
  using (
    project_id in (select id from projects where owner_id = auth.uid())
  );

-- ---- Tasks ----

-- Helper: projects the current user can access
-- (Used inline in policies — Supabase evaluates subqueries in RLS)

create policy "Project members can view tasks"
  on tasks for select
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid()
    )
  );

create policy "Project editors can insert tasks"
  on tasks for insert
  with check (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

create policy "Project editors can update tasks"
  on tasks for update
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

create policy "Project editors can delete tasks"
  on tasks for delete
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

-- ---- Templates ----

create policy "Users can view templates"
  on templates for select
  using (
    is_global = true
    or project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid()
    )
  );

create policy "Project editors can insert templates"
  on templates for insert
  with check (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

create policy "Project editors can update templates"
  on templates for update
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

create policy "Project editors can delete templates"
  on templates for delete
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

-- ---- Time entries ----

create policy "Users can view time entries for accessible projects"
  on time_entries for select
  using (
    project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid()
    )
  );

create policy "Users can insert own time entries"
  on time_entries for insert
  with check (
    user_id = auth.uid()
    and project_id in (
      select id from projects where owner_id = auth.uid()
      union
      select project_id from project_members where user_id = auth.uid() and role in ('owner', 'editor')
    )
  );

create policy "Users can update own time entries"
  on time_entries for update
  using (user_id = auth.uid());

create policy "Users can delete own time entries"
  on time_entries for delete
  using (user_id = auth.uid());

-- ============================================================
-- Indexes
-- ============================================================

-- Projects
create index idx_projects_owner_id on projects (owner_id);
create index idx_projects_archived on projects (archived) where archived = false;

-- Project members
create index idx_project_members_user_id on project_members (user_id);

-- Tasks
create index idx_tasks_project_id on tasks (project_id);
create index idx_tasks_status on tasks (status);
create index idx_tasks_created_by on tasks (created_by);
create index idx_tasks_completed on tasks (completed) where completed = false;
create index idx_tasks_due on tasks (due) where due is not null;

-- Templates
create index idx_templates_project_id on templates (project_id);
create index idx_templates_global on templates (is_global) where is_global = true;

-- Time entries
create index idx_time_entries_project_id on time_entries (project_id);
create index idx_time_entries_task_id on time_entries (task_id);
create index idx_time_entries_user_id on time_entries (user_id);
create index idx_time_entries_started_at on time_entries (started_at);
