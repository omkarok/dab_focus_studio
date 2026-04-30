// ============================================================
// Project context — projects within the current team.
// DB-backed when Supabase is configured; falls back to a single
// "Default" placeholder project when not.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { db, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";
import { useWorkspace } from "@/lib/workspaceContext";

export type Project = {
  id: string;
  teamId?: string;
  name: string;
  client: string;
  color: string;
  ownerId?: string;
  createdAt: string;
  archived?: boolean;
};

const ACTIVE_PROJECT_KEY = "acs_active_project_v1";

export const PLACEHOLDER_PROJECT: Project = {
  id: "default",
  name: "General",
  client: "Personal",
  color: "#6366f1",
  createdAt: new Date(0).toISOString(),
};

function mapProject(r: any): Project {
  return {
    id: r.id,
    teamId: r.team_id,
    name: r.name,
    client: r.client,
    color: r.color,
    ownerId: r.owner_id,
    archived: r.archived,
    createdAt: r.created_at,
  };
}

interface ProjectContextValue {
  loading: boolean;
  projects: Project[];
  activeProject: Project;
  activeProjectId: string;
  setActiveProject: (id: string) => void;
  addProject: (project: Omit<Project, "id" | "createdAt" | "teamId" | "ownerId">) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

function loadActiveProjectId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (raw) return JSON.parse(raw) as string;
  } catch {
    /* ignore */
  }
  return "default";
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentTeam } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string>(loadActiveProjectId);

  // Persist active project id
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(activeProjectId));
    } catch {
      /* ignore */
    }
  }, [activeProjectId]);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProjects([PLACEHOLDER_PROJECT]);
      setLoading(false);
      return;
    }
    if (!currentTeam) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await db
        .from("projects")
        .select("*")
        .eq("team_id", currentTeam.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []).map(mapProject);
      setProjects(rows);

      // Auto-pick first project if current selection is invalid
      setActiveProjectId((prev) => {
        if (rows.find((p) => p.id === prev)) return prev;
        return rows[0]?.id ?? "default";
      });
    } catch (e) {
      console.error("Failed to load projects:", e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? PLACEHOLDER_PROJECT;
  }, [projects, activeProjectId]);

  const setActiveProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const addProject = useCallback(
    async (input: Omit<Project, "id" | "createdAt" | "teamId" | "ownerId">): Promise<Project> => {
      if (!isSupabaseConfigured() || !currentTeam || !user) {
        // Fallback: localStorage-only stub
        const stub: Project = {
          ...input,
          id: Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
        };
        setProjects((prev) => [...prev, stub]);
        return stub;
      }
      const { data, error } = await db
        .from("projects")
        .insert({
          team_id: currentTeam.id,
          name: input.name,
          client: input.client,
          color: input.color,
          owner_id: user.id,
          archived: input.archived ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      const newProj = mapProject(data);
      setProjects((prev) => [...prev, newProj]);
      return newProj;
    },
    [currentTeam, user]
  );

  const updateProject = useCallback(
    async (id: string, patch: Partial<Project>): Promise<void> => {
      if (!isSupabaseConfigured()) {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
        return;
      }
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.client !== undefined) dbPatch.client = patch.client;
      if (patch.color !== undefined) dbPatch.color = patch.color;
      if (patch.archived !== undefined) dbPatch.archived = patch.archived;
      const { error } = await db.from("projects").update(dbPatch).eq("id", id);
      if (error) throw error;
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    []
  );

  const archiveProject = useCallback(
    async (id: string): Promise<void> => {
      await updateProject(id, { archived: true });
      setActiveProjectId((current) => {
        if (current === id) {
          const remaining = projects.filter((p) => p.id !== id && !p.archived);
          return remaining[0]?.id ?? "default";
        }
        return current;
      });
    },
    [updateProject, projects]
  );

  return (
    <ProjectContext.Provider
      value={{
        loading,
        projects,
        activeProject,
        activeProjectId,
        setActiveProject,
        addProject,
        updateProject,
        archiveProject,
        refresh,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider");
  return ctx;
}
