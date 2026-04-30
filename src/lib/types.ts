// ============================================================
// Canonical types for AI Consulting Studio
// All features should import from this file.
// ============================================================

import type { Task, Template, ColumnKey, Priority } from "@/FocusStudioStarter";

export type { Task, Template, ColumnKey, Priority };

/** Authenticated user profile (maps to Supabase auth.users + consulting.profiles). */
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

/** Public mirror of auth.users for member lookups. */
export type Profile = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
};

export type WorkspaceRole = "owner" | "admin" | "member";
export type TeamRole = "lead" | "member";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt: string;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type Team = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  createdBy?: string;
  createdAt: string;
};

export type TeamMember = {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
};

export type Project = {
  id: string;
  teamId: string;
  name: string;
  client: string;
  color: string;
  ownerId: string;
  archived: boolean;
  createdAt: string;
};

export type ProjectMember = {
  projectId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  invitedAt: string;
};

export type Invitation = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  teamIds: string[];
  invitedBy?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  duration: number; // minutes
  note?: string;
  createdAt: string;
};

/**
 * Membership state derived after sign-in. Drives the app's auth gate:
 *   unknown        — still resolving (loading)
 *   bootstrap      — authenticated, no memberships, but is the very first
 *                    user → show "create your first workspace" UI
 *   no-invitation  — authenticated, no memberships, not bootstrap → show
 *                    "you haven't been invited" screen
 *   member         — authenticated, has at least one workspace membership
 */
export type MembershipState = "unknown" | "bootstrap" | "no-invitation" | "member";

// ---- Sync adapter interface (legacy localStorage path) ----

export interface SyncAdapter {
  loadTasks(projectId: string): Promise<Task[]>;
  saveTasks(projectId: string, tasks: Task[]): Promise<void>;
  loadTemplates(projectId: string): Promise<Template[]>;
  saveTemplates(projectId: string, templates: Template[]): Promise<void>;
  loadProjects(userId: string): Promise<Project[]>;
  saveProject(project: Project): Promise<void>;
  loadTimeEntries(projectId: string): Promise<TimeEntry[]>;
  saveTimeEntry(entry: TimeEntry): Promise<void>;
}
