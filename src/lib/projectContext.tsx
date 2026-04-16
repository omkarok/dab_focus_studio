import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Project = {
  id: string;
  name: string;
  client: string;
  color: string;
  createdAt: string;
  archived?: boolean;
};

const PROJECTS_KEY = "acs_projects_v1";
const ACTIVE_PROJECT_KEY = "acs_active_project_v1";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const DEFAULT_PROJECT: Project = {
  id: "default",
  name: "General",
  client: "Personal",
  color: "#6366f1",
  createdAt: new Date(0).toISOString(),
};

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      // Ensure default project always exists
      if (!parsed.find((p) => p.id === "default")) {
        return [DEFAULT_PROJECT, ...parsed];
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return [DEFAULT_PROJECT];
}

function loadActiveProjectId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (raw) return JSON.parse(raw) as string;
  } catch {
    // ignore
  }
  return "default";
}

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project;
  activeProjectId: string;
  setActiveProject: (id: string) => void;
  addProject: (project: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  getTaskCountForProject: (projectId: string) => number;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(loadActiveProjectId);

  // Persist projects
  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  // Persist active project ID
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(activeProjectId));
    } catch {
      // ignore
    }
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || DEFAULT_PROJECT;

  const setActiveProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const addProject = useCallback((input: Omit<Project, "id" | "createdAt">): Project => {
    const newProject: Project = {
      ...input,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }, []);

  const archiveProject = useCallback((id: string) => {
    if (id === "default") return; // Cannot archive the default project
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archived: true } : p))
    );
    // If archiving the active project, switch to default
    setActiveProjectId((current) => (current === id ? "default" : current));
  }, []);

  const getTaskCountForProject = useCallback((projectId: string): number => {
    try {
      // Check the project-scoped key first
      const raw = localStorage.getItem(`acs_tasks_${projectId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
      // For the default project, also check the legacy key for migration
      if (projectId === "default") {
        const legacy = localStorage.getItem("focus_studio_state_v1");
        if (legacy) {
          const parsed = JSON.parse(legacy);
          return Array.isArray(parsed) ? parsed.length : 0;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        setActiveProject,
        addProject,
        updateProject,
        archiveProject,
        getTaskCountForProject,
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
