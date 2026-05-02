// ============================================================
// Task context — DB-backed when Supabase is configured, with
// localStorage fallback. Same API as before so the existing UI
// in FocusStudioStarter.tsx doesn't need to change.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Task } from "@/FocusStudioStarter";
import { db, supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";
import { useProjects } from "@/lib/projectContext";

const LEGACY_KEY = "focus_studio_state_v1";
const taskKeyForProject = (projectId: string) => `acs_tasks_${projectId}`;

function loadLocalTasks(projectId: string): Task[] {
  try {
    const raw = localStorage.getItem(taskKeyForProject(projectId));
    if (raw) return JSON.parse(raw) as Task[];
    if (projectId === "default") {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const tasks = JSON.parse(legacy) as Task[];
        return tasks.map((t) => ({ ...t, projectId: "default" }));
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveLocalTasks(projectId: string, tasks: Task[]): void {
  try {
    localStorage.setItem(taskKeyForProject(projectId), JSON.stringify(tasks));
  } catch {
    /* ignore */
  }
}

function mapTaskFromDb(r: any): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    notes: r.notes ?? undefined,
    priority: r.priority,
    status: r.status,
    estimate: r.estimate ?? undefined,
    tags: r.tags ?? [],
    due: r.due ?? undefined,
    completed: r.completed,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
    assigneeId: r.assignee_id ?? undefined,
  };
}

function mapTaskToDb(t: Task, projectId: string, userId?: string): Record<string, unknown> {
  return {
    id: t.id,
    project_id: projectId,
    title: t.title,
    notes: t.notes ?? null,
    priority: t.priority,
    status: t.status,
    estimate: t.estimate ?? null,
    tags: t.tags ?? [],
    due: t.due ?? null,
    completed: t.completed ?? false,
    completed_at: t.completedAt ?? null,
    assignee_id: t.assigneeId ?? null,
    created_at: t.createdAt,
    created_by: userId ?? null,
  };
}

interface TaskContextValue {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  updateTask: (id: string, patch: Partial<Task>) => void;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeProjectId } = useProjects();
  const useDb = isSupabaseConfigured();

  const [tasks, setTasksInternal] = useState<Task[]>([]);
  const prevTasksRef = useRef<Task[]>([]);
  const isLoadingRef = useRef<boolean>(true);

  // Apply a remote-originated change without re-persisting.
  const applyRemoteChange = useCallback(
    (next: Task[]) => {
      prevTasksRef.current = next;
      setTasksInternal(next);
    },
    []
  );

  // Load when active project changes + subscribe to realtime updates
  useEffect(() => {
    isLoadingRef.current = true;
    if (!useDb || activeProjectId === "default") {
      const local = loadLocalTasks(activeProjectId);
      setTasksInternal(local);
      prevTasksRef.current = local;
      isLoadingRef.current = false;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await db
          .from("tasks")
          .select("*")
          .eq("project_id", activeProjectId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const rows = (data ?? []).map(mapTaskFromDb);
        if (!cancelled) {
          setTasksInternal(rows);
          prevTasksRef.current = rows;
        }
      } catch (e) {
        console.error("Failed to load tasks:", e);
        if (!cancelled) {
          setTasksInternal([]);
          prevTasksRef.current = [];
        }
      } finally {
        if (!cancelled) isLoadingRef.current = false;
      }
    })();

    // Realtime: apply other users' changes without round-tripping
    const channel = supabase
      .channel(`tasks:project:${activeProjectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "consulting",
          table: "tasks",
          filter: `project_id=eq.${activeProjectId}`,
        },
        (payload: any) => {
          if (cancelled) return;
          const current = prevTasksRef.current;
          if (payload.eventType === "INSERT") {
            const t = mapTaskFromDb(payload.new);
            if (current.find((x) => x.id === t.id)) return;
            applyRemoteChange([t, ...current]);
          } else if (payload.eventType === "UPDATE") {
            const t = mapTaskFromDb(payload.new);
            const next = current.map((x) => (x.id === t.id ? t : x));
            // No-op if our local copy already matches (echo of our own write)
            if (JSON.stringify(next) === JSON.stringify(current)) return;
            applyRemoteChange(next);
          } else if (payload.eventType === "DELETE") {
            const id = payload.old?.id;
            if (!id) return;
            if (!current.find((x) => x.id === id)) return;
            applyRemoteChange(current.filter((x) => x.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [activeProjectId, useDb, applyRemoteChange]);

  // Persist on change (diff-based for DB, full-write for localStorage)
  const persistChanges = useCallback(
    async (prev: Task[], next: Task[]) => {
      if (!useDb || activeProjectId === "default") {
        saveLocalTasks(activeProjectId, next);
        return;
      }

      const prevById = new Map(prev.map((t) => [t.id, t]));
      const nextById = new Map(next.map((t) => [t.id, t]));

      // Removed: in prev but not in next
      const removed = prev.filter((t) => !nextById.has(t.id));
      // Added: in next but not in prev
      const added = next.filter((t) => !prevById.has(t.id));
      // Changed: in both, but JSON-different
      const changed = next.filter((t) => {
        const old = prevById.get(t.id);
        return old && JSON.stringify(old) !== JSON.stringify(t);
      });

      try {
        if (removed.length > 0) {
          const { error } = await db
            .from("tasks")
            .delete()
            .in(
              "id",
              removed.map((t) => t.id)
            );
          if (error) throw error;
        }
        const upserts = [...added, ...changed];
        if (upserts.length > 0) {
          const rows = upserts.map((t) => mapTaskToDb(t, activeProjectId, user?.id));
          const { error } = await db.from("tasks").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
      } catch (e) {
        console.error("Failed to persist tasks:", e);
      }
    },
    [useDb, activeProjectId, user]
  );

  const setTasks: React.Dispatch<React.SetStateAction<Task[]>> = useCallback(
    (action) => {
      setTasksInternal((prev) => {
        const next = typeof action === "function" ? (action as (p: Task[]) => Task[])(prev) : action;
        // Ensure projectId is stamped
        const stamped = next.map((t) => (t.projectId ? t : { ...t, projectId: activeProjectId }));
        // Persist async
        if (!isLoadingRef.current) void persistChanges(prevTasksRef.current, stamped);
        prevTasksRef.current = stamped;
        return stamped;
      });
    },
    [activeProjectId, persistChanges]
  );

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, [setTasks]);

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
