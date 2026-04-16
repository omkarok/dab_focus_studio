// ============================================================
// Canonical types for AI Consulting Studio
// All features should import from this file.
// ============================================================

import type { Task, Template, ColumnKey, Priority } from "@/FocusStudioStarter";

// Re-export core types so consumers can import everything from one place
export type { Task, Template, ColumnKey, Priority };

// ---- New types for Supabase-backed features ----

/** Authenticated user profile (maps to Supabase auth.users). */
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

/** A consulting project that contains tasks and templates. */
export type Project = {
  id: string;
  name: string;
  client: string;
  color: string;
  ownerId: string;
  archived: boolean;
  createdAt: string; // ISO
};

/** A member of a project with a specific role. */
export type ProjectMember = {
  projectId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  invitedAt: string; // ISO
};

/** A time-tracking entry linked to a task within a project. */
export type TimeEntry = {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  duration: number; // minutes
  note?: string;
  createdAt: string; // ISO
};

// ---- Sync adapter interface ----

/**
 * SyncAdapter abstracts storage so the app can seamlessly switch
 * between localStorage (offline) and Supabase (cloud) backends.
 */
export interface SyncAdapter {
  // Tasks
  loadTasks(projectId: string): Promise<Task[]>;
  saveTasks(projectId: string, tasks: Task[]): Promise<void>;

  // Templates
  loadTemplates(projectId: string): Promise<Template[]>;
  saveTemplates(projectId: string, templates: Template[]): Promise<void>;

  // Projects
  loadProjects(userId: string): Promise<Project[]>;
  saveProject(project: Project): Promise<void>;

  // Time entries
  loadTimeEntries(projectId: string): Promise<TimeEntry[]>;
  saveTimeEntry(entry: TimeEntry): Promise<void>;
}
