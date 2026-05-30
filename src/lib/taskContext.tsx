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
import { isUuid, newUuid } from "@/lib/utils";

const LEGACY_KEY = "focus_studio_state_v1";
const DEFAULT_KEY = "acs_tasks_default";
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

// Drop the per-project localStorage fallback. Called once a rescue has been
// successfully written to the DB, so the same buffered rows aren't re-rescued
// (and re-inserted under fresh UUIDs) on every subsequent reload.
function clearLocalTasks(projectId: string): void {
  try {
    localStorage.removeItem(taskKeyForProject(projectId));
  } catch {
    /* ignore */
  }
}

// Tasks created while activeProjectId was still "default" (the brief window
// after sign-in but before the projects list resolves) are saved under
// acs_tasks_default. Once a real project is active we need to drag those —
// plus any pre-Supabase legacy tasks — into it; otherwise they look "lost"
// after reload because the per-project load only reads the project's own key.
function loadOrphanedDefaultTasks(): Task[] {
  const out: Task[] = [];
  const seen = new Set<string>();
  try {
    const raw = localStorage.getItem(DEFAULT_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const t of arr as Task[]) {
          if (t?.id && !seen.has(t.id)) {
            seen.add(t.id);
            out.push(t);
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const t of arr as Task[]) {
          if (t?.id && !seen.has(t.id)) {
            seen.add(t.id);
            out.push(t);
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function clearOrphanedDefaultTasks(): void {
  try {
    localStorage.removeItem(DEFAULT_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
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
  persistError: string | null;
  clearPersistError: () => void;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeProjectId } = useProjects();
  const useDb = isSupabaseConfigured();

  const [tasks, setTasksInternal] = useState<Task[]>([]);
  const [persistError, setPersistError] = useState<string | null>(null);
  const clearPersistError = useCallback(() => setPersistError(null), []);
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

  // Persist on change (diff-based for DB, full-write for localStorage).
  // Defined before the load effect so it can be included in the dep array.
  const persistChanges = useCallback(
    async (prev: Task[], next: Task[]): Promise<boolean> => {
      if (!useDb || activeProjectId === "default") {
        saveLocalTasks(activeProjectId, next);
        return true;
      }

      const prevById = new Map(prev.map((t) => [t.id, t]));
      const nextById = new Map(next.map((t) => [t.id, t]));

      const removed = prev.filter((t) => !nextById.has(t.id));
      const added = next.filter((t) => !prevById.has(t.id));
      const changed = next.filter((t) => {
        const old = prevById.get(t.id);
        return old && JSON.stringify(old) !== JSON.stringify(t);
      });

      if (removed.length === 0 && added.length === 0 && changed.length === 0) return true;

      console.log(`[tasks] persisting — +${added.length} ~${changed.length} -${removed.length} project=${activeProjectId}`);
      try {
        if (removed.length > 0) {
          const { error } = await db
            .from("tasks")
            .delete()
            .in("id", removed.map((t) => t.id));
          if (error) throw error;
        }
        const upserts = [...added, ...changed];
        if (upserts.length > 0) {
          const rows = upserts.map((t) => mapTaskToDb(t, activeProjectId, user?.id));
          console.log("[tasks] upserting rows:", rows);
          const { error } = await db.from("tasks").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        console.log("[tasks] persist OK");
        setPersistError(null);
        return true;
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error("[tasks] persist FAILED:", e);
        setPersistError(`Save failed: ${msg}. Open DevTools console for details.`);
        // Fallback: keep a local copy so tasks survive the session
        saveLocalTasks(activeProjectId, next);
        return false;
      }
    },
    [useDb, activeProjectId, user]
  );

  // Load when active project changes + subscribe to realtime updates
  useEffect(() => {
    isLoadingRef.current = true;
    // Snapshot the tasks already in memory before this fetch starts so we can
    // detect tasks the user adds during the async window and rescue them.
    const snapshotAtStart = prevTasksRef.current.slice();

    if (!useDb || activeProjectId === "default") {
      const local = loadLocalTasks(activeProjectId);
      setTasksInternal(local);
      prevTasksRef.current = local;
      isLoadingRef.current = false;
      return;
    }

    let cancelled = false;
    (async () => {
      let dbRows: Task[] | null = null;
      try {
        const { data, error } = await db
          .from("tasks")
          .select("*")
          .eq("project_id", activeProjectId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        dbRows = (data ?? []).map(mapTaskFromDb);
      } catch (e) {
        console.error("Failed to load tasks:", e);
      }
      if (cancelled) return;

      // Build the rescue set from three sources, deduped by id:
      //   1. in-flight: tasks added to memory while the fetch was running
      //   2. per-project localStorage fallback: from prior failed persists
      //   3. orphaned "default" / legacy keys: tasks saved before
      //      activeProjectId resolved to a real UUID
      // On fetch failure dbRows is null — we still want to surface whatever
      // we have locally instead of wiping state.
      const dbList = dbRows ?? [];
      const dbIds = new Set(dbList.map((r) => r.id));

      const inFlight = prevTasksRef.current.filter(
        (t) => !snapshotAtStart.find((s) => s.id === t.id) && !dbIds.has(t.id)
      );
      const localFallback = loadLocalTasks(activeProjectId).filter(
        (t) => !dbIds.has(t.id)
      );
      const orphanedDefaults = loadOrphanedDefaultTasks().filter(
        (t) => !dbIds.has(t.id)
      );

      // Content signature of rows already in the DB. A buffered task whose id
      // was regenerated during a prior rescue keeps its original (non-matching)
      // id in localStorage, so an id-only check would let it be re-inserted as
      // a fresh duplicate on every reload. Matching on title + creation time
      // recognises the existing DB twin and skips it.
      const sigOf = (t: Task) => `${t.title} ${t.createdAt}`;
      const dbSig = new Set(dbList.map(sigOf));

      const seen = new Set<string>(dbIds);
      const toRescue: Task[] = [];
      for (const t of [...inFlight, ...localFallback, ...orphanedDefaults]) {
        if (!t) continue;
        if (dbSig.has(sigOf(t))) continue;
        // Pre-UUID legacy ids are base-36 strings; the DB column is uuid
        // and would 22P02 the upsert. Regenerate them on rescue.
        const id = isUuid(t.id) ? t.id : newUuid();
        if (seen.has(id)) continue;
        seen.add(id);
        // Re-stamp the projectId so the rescue upsert lands in the right project.
        toRescue.push({ ...t, id, projectId: activeProjectId });
      }

      const merged = [...toRescue, ...dbList];
      setTasksInternal(merged);
      prevTasksRef.current = merged;
      isLoadingRef.current = false;

      if (dbRows !== null) {
        // Load succeeded — the DB is now the source of truth for this project.
        if (toRescue.length > 0) {
          // Push the rescue tasks to the DB. Only once that write is confirmed
          // do we drop the local buffers that fed it — otherwise the same rows
          // would be re-rescued (under fresh UUIDs) on every reload, which is
          // exactly what made "Now" tasks multiply on refresh.
          console.log(`[tasks] rescuing ${toRescue.length} locally-buffered task(s)`);
          void (async () => {
            const ok = await persistChanges(dbList, merged);
            if (ok) {
              clearLocalTasks(activeProjectId);
              if (orphanedDefaults.length > 0) clearOrphanedDefaultTasks();
            }
            // If the write failed, persistChanges already mirrored `merged` to
            // the per-project fallback; leave the buffers in place to retry.
          })();
        } else {
          // Nothing to rescue. Any per-project fallback / orphaned-default keys
          // still on disk are stale copies of rows already in the DB; clear them
          // so they can never resurface as duplicates later.
          if (localFallback.length > 0) clearLocalTasks(activeProjectId);
          if (orphanedDefaults.length > 0) clearOrphanedDefaultTasks();
        }
      } else if (toRescue.length > 0) {
        // Load failed — don't retry the DB write (it'd just fail again),
        // but mirror the full set to per-project localStorage so the
        // in-flight tasks survive a reload. The orphaned-default keys are
        // intentionally left in place until at least one successful load.
        console.log(`[tasks] load failed; mirroring ${merged.length} task(s) to local fallback`);
        saveLocalTasks(activeProjectId, merged);
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
  }, [activeProjectId, useDb, applyRemoteChange, persistChanges]);

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
    <TaskContext.Provider value={{ tasks, setTasks, updateTask, persistError, clearPersistError }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
