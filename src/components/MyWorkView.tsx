// ============================================================
// MyWorkView — cross-project task list scoped to the current
// user as assignee, within the current workspace.
// ============================================================

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";
import { useWorkspace } from "@/lib/workspaceContext";
import { useProjects } from "@/lib/projectContext";
import type { Task, ColumnKey } from "@/FocusStudioStarter";
import { Inbox, Clock, ListTodo } from "lucide-react";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  backlog: "Backlog",
  done: "Done",
};

const COLUMN_ORDER: ColumnKey[] = ["now", "next", "later", "backlog", "done"];

type TaskWithProject = Task & { projectName: string; projectColor: string };

function mapTask(r: any): Task {
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

export function MyWorkView() {
  const { user } = useAuth();
  const { currentWorkspace, teams } = useWorkspace();
  const { projects } = useProjects();
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user || !currentWorkspace) {
      setTasks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const teamIds = teams.map((t) => t.id);
        if (teamIds.length === 0) {
          setTasks([]);
          return;
        }

        // Find all projects in the workspace
        const { data: projectsData, error: projErr } = await db
          .from("projects")
          .select("id, name, color")
          .in("team_id", teamIds);
        if (projErr) throw projErr;
        const projectIds = (projectsData ?? []).map((p: any) => p.id);
        if (projectIds.length === 0) {
          setTasks([]);
          return;
        }
        const projMap = new Map<string, { name: string; color: string }>();
        (projectsData ?? []).forEach((p: any) =>
          projMap.set(p.id, { name: p.name, color: p.color })
        );

        // Find tasks assigned to me in those projects
        const { data: tasksData, error: tasksErr } = await db
          .from("tasks")
          .select("*")
          .eq("assignee_id", user.id)
          .in("project_id", projectIds)
          .order("due", { ascending: true, nullsFirst: false });
        if (tasksErr) throw tasksErr;

        if (cancelled) return;
        const enriched: TaskWithProject[] = (tasksData ?? []).map((row: any) => {
          const t = mapTask(row);
          const proj = projMap.get(row.project_id);
          return {
            ...t,
            projectName: proj?.name ?? "Unknown",
            projectColor: proj?.color ?? "#6366f1",
          };
        });
        setTasks(enriched);
      } catch (e) {
        console.error("Failed to load My Work:", e);
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We re-run on workspace + teams + projects change since assignment can shift.
  }, [user, currentWorkspace, teams, projects]);

  const grouped = useMemo(() => {
    const m: Record<ColumnKey, TaskWithProject[]> = {
      now: [],
      next: [],
      later: [],
      backlog: [],
      done: [],
    };
    tasks.forEach((t) => {
      const col = (t.status in m ? t.status : "backlog") as ColumnKey;
      m[col].push(t);
    });
    return m;
  }, [tasks]);

  const totalActive = tasks.filter((t) => !t.completed).length;
  const dueToday = tasks.filter((t) => {
    if (!t.due || t.completed) return false;
    const due = new Date(t.due);
    const now = new Date();
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  }).length;

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading your assigned work...</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          My Work
        </h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListTodo className="h-3.5 w-3.5" />
            {totalActive} active
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {dueToday} due today
          </span>
        </div>
      </div>

      {tasks.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No tasks assigned to you in this workspace yet.
          </CardContent>
        </Card>
      )}

      {COLUMN_ORDER.map((col) => {
        const items = grouped[col];
        if (items.length === 0) return null;
        return (
          <Card key={col} className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {COLUMN_LABELS[col]}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.projectColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.projectName}
                      {t.due && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span>Due {new Date(t.due).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {t.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
