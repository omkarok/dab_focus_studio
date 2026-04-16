// ============================================================
// Sync adapters — bridge between localStorage and Supabase
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, Template } from "@/FocusStudioStarter";
import type { Project, TimeEntry, SyncAdapter } from "@/lib/types";

// ---- localStorage keys (match existing conventions) ----

const LS_TASKS_KEY = "focus_studio_state_v1";
const LS_TEMPLATES_KEY = "focus_studio_templates_v1";
const LS_PROJECTS_KEY = "focus_studio_projects_v1";
const LS_TIME_ENTRIES_KEY = "focus_studio_time_entries_v1";

// ---- Helpers ----

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or unavailable — silently ignore
  }
}

// ============================================================
// 1. Local adapter — pure localStorage
// ============================================================

export function createLocalAdapter(): SyncAdapter {
  return {
    // Tasks -----------------------------------------------
    async loadTasks(_projectId: string): Promise<Task[]> {
      return lsGet<Task[]>(LS_TASKS_KEY, []);
    },
    async saveTasks(_projectId: string, tasks: Task[]): Promise<void> {
      lsSet(LS_TASKS_KEY, tasks);
    },

    // Templates -------------------------------------------
    async loadTemplates(_projectId: string): Promise<Template[]> {
      return lsGet<Template[]>(LS_TEMPLATES_KEY, []);
    },
    async saveTemplates(_projectId: string, templates: Template[]): Promise<void> {
      lsSet(LS_TEMPLATES_KEY, templates);
    },

    // Projects --------------------------------------------
    async loadProjects(_userId: string): Promise<Project[]> {
      return lsGet<Project[]>(LS_PROJECTS_KEY, []);
    },
    async saveProject(project: Project): Promise<void> {
      const existing = lsGet<Project[]>(LS_PROJECTS_KEY, []);
      const idx = existing.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        existing[idx] = project;
      } else {
        existing.push(project);
      }
      lsSet(LS_PROJECTS_KEY, existing);
    },

    // Time entries ----------------------------------------
    async loadTimeEntries(_projectId: string): Promise<TimeEntry[]> {
      return lsGet<TimeEntry[]>(LS_TIME_ENTRIES_KEY, []);
    },
    async saveTimeEntry(entry: TimeEntry): Promise<void> {
      const existing = lsGet<TimeEntry[]>(LS_TIME_ENTRIES_KEY, []);
      const idx = existing.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        existing[idx] = entry;
      } else {
        existing.push(entry);
      }
      lsSet(LS_TIME_ENTRIES_KEY, existing);
    },
  };
}

// ============================================================
// 2. Supabase adapter — reads/writes to the remote database
// ============================================================

export function createSupabaseAdapter(
  client: SupabaseClient,
  userId: string,
): SyncAdapter {
  return {
    // Tasks -----------------------------------------------
    async loadTasks(projectId: string): Promise<Task[]> {
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapTaskFromDb);
    },

    async saveTasks(projectId: string, tasks: Task[]): Promise<void> {
      // Upsert all tasks for the project
      const rows = tasks.map((t) => mapTaskToDb(t, projectId, userId));
      const { error } = await client.from("tasks").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },

    // Templates -------------------------------------------
    async loadTemplates(projectId: string): Promise<Template[]> {
      const { data, error } = await client
        .from("templates")
        .select("*")
        .or(`project_id.eq.${projectId},is_global.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapTemplateFromDb);
    },

    async saveTemplates(projectId: string, templates: Template[]): Promise<void> {
      const rows = templates.map((t) => mapTemplateToDb(t, projectId));
      const { error } = await client.from("templates").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },

    // Projects --------------------------------------------
    async loadProjects(_userId: string): Promise<Project[]> {
      const { data, error } = await client
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapProjectFromDb);
    },

    async saveProject(project: Project): Promise<void> {
      const row = mapProjectToDb(project);
      const { error } = await client.from("projects").upsert(row, { onConflict: "id" });
      if (error) throw error;
    },

    // Time entries ----------------------------------------
    async loadTimeEntries(projectId: string): Promise<TimeEntry[]> {
      const { data, error } = await client
        .from("time_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapTimeEntryFromDb);
    },

    async saveTimeEntry(entry: TimeEntry): Promise<void> {
      const row = mapTimeEntryToDb(entry);
      const { error } = await client.from("time_entries").upsert(row, { onConflict: "id" });
      if (error) throw error;
    },
  };
}

// ============================================================
// 3. Synced adapter — writes to both, reads from remote with
//    local fallback when offline
// ============================================================

export function createSyncedAdapter(
  local: SyncAdapter,
  remote: SyncAdapter,
): SyncAdapter {
  /**
   * Try the remote call first. If it fails (offline, network error, etc.)
   * fall back to local transparently.
   */
  async function withFallback<T>(remoteFn: () => Promise<T>, localFn: () => Promise<T>): Promise<T> {
    try {
      return await remoteFn();
    } catch {
      // Remote failed — use local data
      return localFn();
    }
  }

  /**
   * Write to both. Always write to local. If remote fails, swallow
   * the error — data is safe locally and can be synced later.
   */
  async function writeBoth(localFn: () => Promise<void>, remoteFn: () => Promise<void>): Promise<void> {
    await localFn();
    try {
      await remoteFn();
    } catch {
      // Remote write failed — data is persisted locally
    }
  }

  return {
    // Tasks -----------------------------------------------
    async loadTasks(projectId: string): Promise<Task[]> {
      return withFallback(
        () => remote.loadTasks(projectId),
        () => local.loadTasks(projectId),
      );
    },
    async saveTasks(projectId: string, tasks: Task[]): Promise<void> {
      return writeBoth(
        () => local.saveTasks(projectId, tasks),
        () => remote.saveTasks(projectId, tasks),
      );
    },

    // Templates -------------------------------------------
    async loadTemplates(projectId: string): Promise<Template[]> {
      return withFallback(
        () => remote.loadTemplates(projectId),
        () => local.loadTemplates(projectId),
      );
    },
    async saveTemplates(projectId: string, templates: Template[]): Promise<void> {
      return writeBoth(
        () => local.saveTemplates(projectId, templates),
        () => remote.saveTemplates(projectId, templates),
      );
    },

    // Projects --------------------------------------------
    async loadProjects(userId: string): Promise<Project[]> {
      return withFallback(
        () => remote.loadProjects(userId),
        () => local.loadProjects(userId),
      );
    },
    async saveProject(project: Project): Promise<void> {
      return writeBoth(
        () => local.saveProject(project),
        () => remote.saveProject(project),
      );
    },

    // Time entries ----------------------------------------
    async loadTimeEntries(projectId: string): Promise<TimeEntry[]> {
      return withFallback(
        () => remote.loadTimeEntries(projectId),
        () => local.loadTimeEntries(projectId),
      );
    },
    async saveTimeEntry(entry: TimeEntry): Promise<void> {
      return writeBoth(
        () => local.saveTimeEntry(entry),
        () => remote.saveTimeEntry(entry),
      );
    },
  };
}

// ============================================================
// DB row mapping helpers (snake_case <-> camelCase)
// ============================================================

// ---- Tasks ----

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  notes: string | null;
  priority: string;
  status: string;
  estimate: number | null;
  tags: string[];
  due: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

function mapTaskFromDb(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    estimate: row.estimate ?? undefined,
    tags: row.tags ?? [],
    due: row.due ?? undefined,
    completed: row.completed,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapTaskToDb(task: Task, projectId: string, userId: string): TaskRow {
  return {
    id: task.id,
    project_id: projectId,
    title: task.title,
    notes: task.notes ?? null,
    priority: task.priority,
    status: task.status,
    estimate: task.estimate ?? null,
    tags: task.tags ?? [],
    due: task.due ?? null,
    completed: task.completed ?? false,
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    created_by: userId,
  };
}

// ---- Templates ----

interface TemplateRow {
  id: string;
  project_id: string | null;
  name: string;
  tasks: unknown; // JSONB
  columns: unknown; // JSONB
  is_global: boolean;
  created_at: string;
}

function mapTemplateFromDb(row: TemplateRow): Template {
  return {
    name: row.name,
    tasks: (row.tasks as Task[]) ?? [],
    columns: (row.columns as Template["columns"]) ?? undefined,
  };
}

function mapTemplateToDb(tpl: Template, projectId: string): Record<string, unknown> {
  return {
    name: tpl.name,
    project_id: projectId,
    tasks: tpl.tasks,
    columns: tpl.columns ?? ["now", "next", "later", "backlog", "done"],
    is_global: false,
  };
}

// ---- Projects ----

interface ProjectRow {
  id: string;
  name: string;
  client: string;
  color: string;
  owner_id: string;
  archived: boolean;
  created_at: string;
}

function mapProjectFromDb(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    color: row.color,
    ownerId: row.owner_id,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

function mapProjectToDb(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    client: project.client,
    color: project.color,
    owner_id: project.ownerId,
    archived: project.archived,
    created_at: project.createdAt,
  };
}

// ---- Time entries ----

interface TimeEntryRow {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration: number;
  note: string | null;
  created_at: string;
}

function mapTimeEntryFromDb(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    duration: row.duration,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function mapTimeEntryToDb(entry: TimeEntry): TimeEntryRow {
  return {
    id: entry.id,
    task_id: entry.taskId,
    project_id: entry.projectId,
    user_id: entry.userId,
    started_at: entry.startedAt,
    ended_at: entry.endedAt ?? null,
    duration: entry.duration,
    note: entry.note ?? null,
    created_at: entry.createdAt,
  };
}
