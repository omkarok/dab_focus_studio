import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Task } from "@/FocusStudioStarter";
import { useProjects } from "@/lib/projectContext";

const LEGACY_KEY = "focus_studio_state_v1";

function taskKeyForProject(projectId: string): string {
  return `acs_tasks_${projectId}`;
}

function loadTasksForProject(projectId: string): Task[] {
  try {
    const key = taskKeyForProject(projectId);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as Task[];
    }
    // Migration: for default project, check legacy key
    if (projectId === "default") {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const tasks = JSON.parse(legacy) as Task[];
        // Migrate: assign projectId to each task and save under new key
        const migrated = tasks.map((t) => ({ ...t, projectId: "default" }));
        try {
          localStorage.setItem(key, JSON.stringify(migrated));
          // Remove legacy key after successful migration
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          // ignore storage errors
        }
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

interface TaskContextValue {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  updateTask: (id: string, patch: Partial<Task>) => void;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { activeProjectId } = useProjects();
  const [tasks, setTasksInternal] = useState<Task[]>(() =>
    loadTasksForProject(activeProjectId)
  );

  // When active project changes, load that project's tasks
  useEffect(() => {
    setTasksInternal(loadTasksForProject(activeProjectId));
  }, [activeProjectId]);

  // Persist tasks whenever they change
  useEffect(() => {
    try {
      const key = taskKeyForProject(activeProjectId);
      localStorage.setItem(key, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks, activeProjectId]);

  // Wrap setTasks to auto-assign projectId on new tasks
  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback(
    (action) => {
      setTasksInternal((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        // Ensure all tasks have the current projectId
        return next.map((t) => (t.projectId ? t : { ...t, projectId: activeProjectId }));
      });
    },
    [activeProjectId]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasksInternal((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
    },
    []
  );

  return (
    <TaskContext.Provider value={{ tasks, setTasks, updateTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
