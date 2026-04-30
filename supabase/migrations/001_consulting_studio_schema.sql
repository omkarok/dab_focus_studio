-- ============================================================
-- AI Consulting Studio — Initial Schema (multi-tenant)
-- ============================================================
-- All tables live in the dedicated `consulting` schema so this
-- app coexists cleanly with other apps in the same Supabase
-- project (e.g. HR ANEXI GPT in `public`).
--
-- Hierarchy: Workspace → Team → Project → Task
-- Auth is shared via Supabase `auth.users`; we mirror minimal
-- profile data into `consulting.profiles` for member lookups.
--
-- The "invite-only" signup gate is enforced at the application
-- layer (not via an auth.users trigger), so signups for other
-- apps in this DB are unaffected. The app checks for
-- workspace_members membership after sign-in; if none and no
-- pending invitation matches the user's email and the user is
-- not the very first profile, the app signs them out.
-- ============================================================

-- ============================================================
-- 0. Schema
-- ============================================================

create schema if not exists consulting;

-- Allow the standard Supabase roles to use the schema
grant usage on schema consulting to authenticated, anon, service_role;
alter default privileges in schema consulting grant all on tables to authenticated, service_role;
alter default privileges in schema consulting grant all on sequences to authenticated, service_role;
alter default privileges in schema consulting grant execute on functions to authenticated, service_role;

-- ============================================================
-- 1. Profiles (public mirror of auth.users for this app)
-- ============================================================

create table consulting.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table consulting.profiles enable row level security;

create policy "Authenticated can view profiles"
  on consulting.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on consulting.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update own profile"
  on consulting.profiles for update
  using (id = auth.uid());

-- ============================================================
-- 2. Workspaces and workspace_members
-- ============================================================

create table consulting.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table consulting.workspace_members (
  workspace_id uuid references consulting.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

alter table consulting.workspaces enable row level security;
alter table consulting.workspace_members enable row level security;

-- ============================================================
-- 3. Teams and team_members
-- ============================================================

create table consulting.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references consulting.workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  color text default '#6366f1',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table consulting.team_members (
  team_id uuid references consulting.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member')),
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

alter table consulting.teams enable row level security;
alter table consulting.team_members enable row level security;

-- ============================================================
-- 4. Projects (belong to a team)
-- ============================================================

create table consulting.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references consulting.teams(id) on delete cascade not null,
  name text not null,
  client text not null,
  color text not null default '#6366f1',
  owner_id uuid references auth.users(id) not null,
  archived boolean default false,
  created_at timestamptz default now()
);

create table consulting.project_members (
  project_id uuid references consulting.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  invited_at timestamptz default now(),
  primary key (project_id, user_id)
);

alter table consulting.projects enable row level security;
alter table consulting.project_members enable row level security;

-- ============================================================
-- 5. Tasks (with assignee)
-- ============================================================

create table consulting.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references consulting.projects(id) on delete cascade not null,
  title text not null,
  notes text,
  priority text not null default 'P1',
  status text not null default 'backlog',
  estimate integer,
  tags text[] default '{}',
  due timestamptz,
  completed boolean default false,
  completed_at timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table consulting.tasks enable row level security;

-- ============================================================
-- 6. Templates
-- ============================================================

create table consulting.templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references consulting.projects(id) on delete cascade,
  name text not null,
  tasks jsonb not null default '[]',
  columns jsonb not null default '["now","next","later","backlog","done"]',
  is_global boolean default false,
  created_at timestamptz default now()
);

alter table consulting.templates enable row level security;

-- ============================================================
-- 7. Time entries
-- ============================================================

create table consulting.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references consulting.tasks(id) on delete cascade not null,
  project_id uuid references consulting.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration integer not null default 0,
  note text,
  created_at timestamptz default now()
);

alter table consulting.time_entries enable row level security;

-- ============================================================
-- 8. Invitations (pending invites resolved on sign-in by app)
-- ============================================================

create table consulting.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references consulting.workspaces(id) on delete cascade not null,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  team_ids uuid[] default '{}',
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (workspace_id, email)
);

alter table consulting.invitations enable row level security;

-- ============================================================
-- 9. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================

create or replace function consulting.user_workspace_ids(uid uuid)
returns setof uuid
language sql
security definer
set search_path = consulting, public
stable
as $$
  select workspace_id from consulting.workspace_members where user_id = uid;
$$;

create or replace function consulting.workspace_role(ws_id uuid, uid uuid)
returns text
language sql
security definer
set search_path = consulting, public
stable
as $$
  select role from consulting.workspace_members where workspace_id = ws_id and user_id = uid limit 1;
$$;

create or replace function consulting.is_workspace_admin(ws_id uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = consulting, public
stable
as $$
  select exists (
    select 1 from consulting.workspace_members
    where workspace_id = ws_id and user_id = uid and role in ('owner', 'admin')
  );
$$;

create or replace function consulting.team_workspace(t_id uuid)
returns uuid
language sql
security definer
set search_path = consulting, public
stable
as $$
  select workspace_id from consulting.teams where id = t_id;
$$;

create or replace function consulting.project_workspace(p_id uuid)
returns uuid
language sql
security definer
set search_path = consulting, public
stable
as $$
  select t.workspace_id
  from consulting.projects p
  join consulting.teams t on p.team_id = t.id
  where p.id = p_id;
$$;

-- Atomic workspace creation: insert workspace + add creator as owner
-- in one SECURITY DEFINER function so RLS doesn't lock out the creator
-- on the second insert.
create or replace function consulting.create_workspace(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = consulting, public
as $$
declare
  v_id uuid;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into consulting.workspaces (name, slug, created_by)
  values (p_name, p_slug, v_uid)
  returning id into v_id;

  insert into consulting.workspace_members (workspace_id, user_id, role)
  values (v_id, v_uid, 'owner');

  return v_id;
end;
$$;

grant execute on function consulting.create_workspace(text, text) to authenticated;

-- Claim any pending invitations for the calling user.
-- Returns the count of invitations attached. The app calls this on
-- sign-in; if zero memberships and zero invites attached and not the
-- bootstrap user, the app signs them out.
create or replace function consulting.claim_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = consulting, public
as $$
declare
  v_uid uuid;
  v_email text;
  v_count integer := 0;
  invite record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    return 0;
  end if;

  for invite in
    select * from consulting.invitations
    where lower(email) = lower(v_email) and accepted_at is null
  loop
    insert into consulting.workspace_members (workspace_id, user_id, role)
    values (invite.workspace_id, v_uid, invite.role)
    on conflict (workspace_id, user_id) do nothing;

    if invite.team_ids is not null and array_length(invite.team_ids, 1) > 0 then
      insert into consulting.team_members (team_id, user_id, role)
      select unnest(invite.team_ids), v_uid, 'member'
      on conflict (team_id, user_id) do nothing;
    end if;

    update consulting.invitations
    set accepted_at = now(), accepted_by = v_uid
    where id = invite.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function consulting.claim_pending_invitations() to authenticated;

-- Returns true if the calling user is the very first profile (bootstrap).
create or replace function consulting.is_bootstrap_user()
returns boolean
language sql
security definer
set search_path = consulting, public
stable
as $$
  select (select count(*) from consulting.profiles) <= 1
    and exists (select 1 from consulting.profiles where id = auth.uid());
$$;

grant execute on function consulting.is_bootstrap_user() to authenticated;

-- ============================================================
-- 10. RLS policies — Workspaces
-- ============================================================

create policy "Members can view their workspaces"
  on consulting.workspaces for select
  using (id in (select consulting.user_workspace_ids(auth.uid())));

create policy "Authenticated can create workspaces"
  on consulting.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Admins/owners can update workspace"
  on consulting.workspaces for update
  using (consulting.is_workspace_admin(id, auth.uid()));

create policy "Owners can delete workspace"
  on consulting.workspaces for delete
  using (consulting.workspace_role(id, auth.uid()) = 'owner');

-- ============================================================
-- 11. RLS policies — workspace_members
-- ============================================================

create policy "Members can view workspace membership"
  on consulting.workspace_members for select
  using (workspace_id in (select consulting.user_workspace_ids(auth.uid())));

-- Allow the SECURITY DEFINER create_workspace function (and admins) to insert.
-- Direct inserts from clients also work for admins; create_workspace handles
-- the bootstrap insert during workspace creation.
create policy "Admins/owners can add members"
  on consulting.workspace_members for insert
  with check (consulting.is_workspace_admin(workspace_id, auth.uid()));

create policy "Admins/owners can update members"
  on consulting.workspace_members for update
  using (consulting.is_workspace_admin(workspace_id, auth.uid()));

create policy "Admins/owners can remove members"
  on consulting.workspace_members for delete
  using (consulting.is_workspace_admin(workspace_id, auth.uid()));

-- ============================================================
-- 12. RLS policies — Teams
-- ============================================================

create policy "Workspace members can view teams"
  on consulting.teams for select
  using (workspace_id in (select consulting.user_workspace_ids(auth.uid())));

create policy "Workspace members can create teams"
  on consulting.teams for insert
  with check (
    workspace_id in (select consulting.user_workspace_ids(auth.uid()))
    and created_by = auth.uid()
  );

create policy "Admins or team leads can update teams"
  on consulting.teams for update
  using (
    consulting.is_workspace_admin(workspace_id, auth.uid())
    or id in (
      select team_id from consulting.team_members
      where user_id = auth.uid() and role = 'lead'
    )
  );

create policy "Admins can delete teams"
  on consulting.teams for delete
  using (consulting.is_workspace_admin(workspace_id, auth.uid()));

-- ============================================================
-- 13. RLS policies — team_members
-- ============================================================

create policy "Workspace members can view team membership"
  on consulting.team_members for select
  using (consulting.team_workspace(team_id) in (select consulting.user_workspace_ids(auth.uid())));

create policy "Admins or team leads can add team members"
  on consulting.team_members for insert
  with check (
    consulting.is_workspace_admin(consulting.team_workspace(team_id), auth.uid())
    or team_id in (
      select tm.team_id from consulting.team_members tm
      where tm.user_id = auth.uid() and tm.role = 'lead'
    )
  );

create policy "Admins or team leads can update team members"
  on consulting.team_members for update
  using (
    consulting.is_workspace_admin(consulting.team_workspace(team_id), auth.uid())
    or team_id in (
      select tm.team_id from consulting.team_members tm
      where tm.user_id = auth.uid() and tm.role = 'lead'
    )
  );

create policy "Admins or team leads can remove team members"
  on consulting.team_members for delete
  using (
    consulting.is_workspace_admin(consulting.team_workspace(team_id), auth.uid())
    or team_id in (
      select tm.team_id from consulting.team_members tm
      where tm.user_id = auth.uid() and tm.role = 'lead'
    )
  );

-- ============================================================
-- 14. RLS policies — Projects
-- ============================================================

create policy "Workspace members can view projects"
  on consulting.projects for select
  using (team_id in (
    select id from consulting.teams
    where workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Workspace members can create projects"
  on consulting.projects for insert
  with check (
    team_id in (
      select id from consulting.teams
      where workspace_id in (select consulting.user_workspace_ids(auth.uid()))
    )
    and owner_id = auth.uid()
  );

create policy "Workspace members can update projects"
  on consulting.projects for update
  using (team_id in (
    select id from consulting.teams
    where workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Owners or admins can delete projects"
  on consulting.projects for delete
  using (
    owner_id = auth.uid()
    or consulting.is_workspace_admin(consulting.project_workspace(id), auth.uid())
  );

-- ============================================================
-- 15. RLS policies — project_members (legacy fine-grained slot)
-- ============================================================

create policy "Workspace members can view project membership"
  on consulting.project_members for select
  using (
    project_id in (
      select p.id from consulting.projects p
      join consulting.teams t on p.team_id = t.id
      where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
    )
  );

create policy "Project owners can manage project members"
  on consulting.project_members for all
  using (
    project_id in (
      select id from consulting.projects where owner_id = auth.uid()
    )
    or consulting.is_workspace_admin(consulting.project_workspace(project_id), auth.uid())
  );

-- ============================================================
-- 16. RLS policies — Tasks
-- ============================================================

create policy "Workspace members can view tasks"
  on consulting.tasks for select
  using (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Workspace members can insert tasks"
  on consulting.tasks for insert
  with check (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Workspace members can update tasks"
  on consulting.tasks for update
  using (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Workspace members can delete tasks"
  on consulting.tasks for delete
  using (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

-- ============================================================
-- 17. RLS policies — Templates
-- ============================================================

create policy "Members can view templates"
  on consulting.templates for select
  using (
    is_global = true
    or project_id in (
      select p.id from consulting.projects p
      join consulting.teams t on p.team_id = t.id
      where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
    )
  );

create policy "Members can insert templates"
  on consulting.templates for insert
  with check (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Members can update templates"
  on consulting.templates for update
  using (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Members can delete templates"
  on consulting.templates for delete
  using (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

-- ============================================================
-- 18. RLS policies — Time entries
-- ============================================================

create policy "Workspace members can view time entries"
  on consulting.time_entries for select
  using (project_id in (
    select p.id from consulting.projects p
    join consulting.teams t on p.team_id = t.id
    where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
  ));

create policy "Users can insert own time entries"
  on consulting.time_entries for insert
  with check (
    user_id = auth.uid()
    and project_id in (
      select p.id from consulting.projects p
      join consulting.teams t on p.team_id = t.id
      where t.workspace_id in (select consulting.user_workspace_ids(auth.uid()))
    )
  );

create policy "Users can update own time entries"
  on consulting.time_entries for update
  using (user_id = auth.uid());

create policy "Users can delete own time entries"
  on consulting.time_entries for delete
  using (user_id = auth.uid());

-- ============================================================
-- 19. RLS policies — Invitations
-- ============================================================

-- Authenticated users can read invitations for their own email so the app
-- can show "you have a pending invite" before claim, and so claim_pending_invitations
-- (SECURITY DEFINER) doesn't depend on this. We read email from
-- consulting.profiles (not auth.users) because the `authenticated` role
-- doesn't have SELECT on auth.users; profiles is the safe public mirror.
create policy "Users can view invitations matching their email"
  on consulting.invitations for select
  to authenticated
  using (
    lower(email) = lower((select email from consulting.profiles where id = auth.uid()))
    or consulting.is_workspace_admin(workspace_id, auth.uid())
  );

create policy "Workspace admins can create invitations"
  on consulting.invitations for insert
  with check (
    consulting.is_workspace_admin(workspace_id, auth.uid())
    and invited_by = auth.uid()
  );

create policy "Workspace admins can update invitations"
  on consulting.invitations for update
  using (consulting.is_workspace_admin(workspace_id, auth.uid()));

create policy "Workspace admins can delete invitations"
  on consulting.invitations for delete
  using (consulting.is_workspace_admin(workspace_id, auth.uid()));

-- ============================================================
-- 20. Indexes
-- ============================================================

create index idx_workspace_members_user_id on consulting.workspace_members (user_id);
create index idx_team_members_user_id on consulting.team_members (user_id);
create index idx_teams_workspace_id on consulting.teams (workspace_id);
create index idx_projects_team_id on consulting.projects (team_id);
create index idx_projects_owner_id on consulting.projects (owner_id);
create index idx_projects_archived on consulting.projects (archived) where archived = false;
create index idx_project_members_user_id on consulting.project_members (user_id);
create index idx_tasks_project_id on consulting.tasks (project_id);
create index idx_tasks_status on consulting.tasks (status);
create index idx_tasks_assignee_id on consulting.tasks (assignee_id) where assignee_id is not null;
create index idx_tasks_completed on consulting.tasks (completed) where completed = false;
create index idx_tasks_due on consulting.tasks (due) where due is not null;
create index idx_templates_project_id on consulting.templates (project_id);
create index idx_templates_global on consulting.templates (is_global) where is_global = true;
create index idx_time_entries_project_id on consulting.time_entries (project_id);
create index idx_time_entries_task_id on consulting.time_entries (task_id);
create index idx_time_entries_user_id on consulting.time_entries (user_id);
create index idx_time_entries_started_at on consulting.time_entries (started_at);
create index idx_invitations_email on consulting.invitations (lower(email)) where accepted_at is null;

-- ============================================================
-- 21. Expose schema to PostgREST so the Supabase JS client can
--     reach it via `supabase.schema('consulting').from(...)`.
-- ============================================================

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, consulting';
notify pgrst, 'reload config';
