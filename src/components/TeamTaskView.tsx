// ============================================================
// TeamTaskView — workspace-wide unified task view.
// Shows every task across every project (RLS-filtered) with
// realtime updates so teammates see each other's work live.
// Supports grouping by Status / Project / Assignee, plus
// status / member / search filters.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db, supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";
import { useWorkspace } from "@/lib/workspaceContext";
import { useProjects } from "@/lib/projectContext";
import type { Task, ColumnKey } from "@/FocusStudioStarter";
import {
  Users,
  Search,
  CircleDot,
  Activity,
  Layers,
  FolderKanban,
  UserCircle2,
  Filter,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  backlog: "Backlog",
  done: "Done",
};

const COLUMN_ORDER: ColumnKey[] = ["now", "next", "later", "backlog", "done"];

const COLUMN_ACCENT: Record<ColumnKey, string> = {
  now: "text-accent",
  next: "text-amber-500",
  later: "text-blue-500",
  backlog: "text-muted-foreground",
  done: "text-emerald-500",
};

const PRIORITY_STYLES: Record<string, string> = {
  P0: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
  P1: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  P2: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
};

type GroupBy = "status" | "project" | "assignee";

type TaskRow = Task & {
  projectName: string;
  projectColor: string;
  updatedAt: string; // last known change time (created_at or realtime now)
};

function mapTask(r: any, projectName: string, projectColor: string): TaskRow {
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
    projectName,
    projectColor,
    updatedAt: r.created_at,
  };
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 30_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

interface TeamTaskViewProps {
  onOpenTask?: (projectId: string, taskId: string) => void;
}

export function TeamTaskView({ onOpenTask }: TeamTaskViewProps) {
  const { user } = useAuth();
  const { currentWorkspace, teams, members, profiles } = useWorkspace();
  const { projects } = useProjects();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  // Filters / view state
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<ColumnKey>>(
    () => new Set(["now", "next", "later", "backlog"]) // hide done by default
  );
  const [memberFilter, setMemberFilter] = useState<Set<string | "unassigned">>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Project lookup for enrichment + realtime
  const projectMapRef = useRef(
    new Map<string, { name: string; color: string }>()
  );
  useEffect(() => {
    const m = new Map<string, { name: string; color: string }>();
    projects.forEach((p) => m.set(p.id, { name: p.name, color: p.color }));
    projectMapRef.current = m;
  }, [projects]);

  // Load + subscribe
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentWorkspace) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: projectsData, error: projErr } = await db
          .from("projects")
          .select("id, name, color")
          .in("team_id", teamIds);
        if (projErr) throw projErr;

        const projMap = new Map<string, { name: string; color: string }>();
        (projectsData ?? []).forEach((p: any) =>
          projMap.set(p.id, { name: p.name, color: p.color })
        );
        projectMapRef.current = projMap;

        const projectIds = Array.from(projMap.keys());
        if (projectIds.length === 0) {
          if (!cancelled) setTasks([]);
          return;
        }

        const { data: tasksData, error: tasksErr } = await db
          .from("tasks")
          .select("*")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });
        if (tasksErr) throw tasksErr;

        if (cancelled) return;
        const enriched = (tasksData ?? []).map((row: any) => {
          const proj = projMap.get(row.project_id) ?? {
            name: "Unknown",
            color: "#64748b",
          };
          return mapTask(row, proj.name, proj.color);
        });
        setTasks(enriched);
      } catch (e) {
        console.error("Failed to load Team tasks:", e);
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Single workspace-wide channel; RLS filters server-side
    const channel = supabase
      .channel(`team-tasks:ws:${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "consulting", table: "tasks" },
        (payload: any) => {
          if (cancelled) return;
          setTasks((prev) => {
            if (payload.eventType === "DELETE") {
              const id = payload.old?.id;
              return id ? prev.filter((t) => t.id !== id) : prev;
            }
            const row = payload.new;
            if (!row) return prev;
            const proj = projectMapRef.current.get(row.project_id);
            if (!proj) return prev; // task in a project we can't see
            const next: TaskRow = {
              ...mapTask(row, proj.name, proj.color),
              updatedAt: new Date().toISOString(),
            };
            const idx = prev.findIndex((t) => t.id === next.id);
            if (idx === -1) return [next, ...prev];
            const copy = prev.slice();
            copy[idx] = next;
            return copy;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setLive(false);
      });

    return () => {
      cancelled = true;
      setLive(false);
      void supabase.removeChannel(channel);
    };
  }, [currentWorkspace, teams]);

  // Re-render every 30s so "Xm ago" stays fresh
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // ---- Filter pipeline ----

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (!statusFilter.has(t.status)) return false;
      if (memberFilter.size > 0) {
        const key = t.assigneeId ?? "unassigned";
        if (!memberFilter.has(key)) return false;
      }
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, statusFilter, memberFilter, search]);

  // ---- Stats ----

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.completed).length;
    const completedToday = tasks.filter((t) => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
    const inFlight = tasks.filter((t) => t.status === "now" && !t.completed).length;
    return { active, completedToday, inFlight, members: members.length };
  }, [tasks, members]);

  // ---- Grouping ----

  const groups = useMemo(() => {
    const out: { key: string; label: string; accent?: string; rows: TaskRow[] }[] = [];
    if (groupBy === "status") {
      const byCol: Record<ColumnKey, TaskRow[]> = {
        now: [], next: [], later: [], backlog: [], done: [],
      };
      filtered.forEach((t) => byCol[t.status].push(t));
      COLUMN_ORDER.forEach((col) => {
        if (byCol[col].length === 0) return;
        out.push({
          key: col,
          label: COLUMN_LABELS[col],
          accent: COLUMN_ACCENT[col],
          rows: byCol[col],
        });
      });
    } else if (groupBy === "project") {
      const m = new Map<string, TaskRow[]>();
      filtered.forEach((t) => {
        const arr = m.get(t.projectId ?? "") ?? [];
        arr.push(t);
        m.set(t.projectId ?? "", arr);
      });
      Array.from(m.entries())
        .sort((a, b) => {
          const an = a[1][0]?.projectName ?? "";
          const bn = b[1][0]?.projectName ?? "";
          return an.localeCompare(bn);
        })
        .forEach(([pid, rows]) => {
          out.push({ key: pid, label: rows[0]?.projectName ?? "Unknown", rows });
        });
    } else {
      const m = new Map<string, TaskRow[]>();
      filtered.forEach((t) => {
        const k = t.assigneeId ?? "__unassigned";
        const arr = m.get(k) ?? [];
        arr.push(t);
        m.set(k, arr);
      });
      Array.from(m.entries())
        .sort((a, b) => {
          if (a[0] === "__unassigned") return 1;
          if (b[0] === "__unassigned") return -1;
          const an = profiles[a[0]]?.name ?? profiles[a[0]]?.email ?? "";
          const bn = profiles[b[0]]?.name ?? profiles[b[0]]?.email ?? "";
          return an.localeCompare(bn);
        })
        .forEach(([uid, rows]) => {
          const label =
            uid === "__unassigned"
              ? "Unassigned"
              : profiles[uid]?.name ?? profiles[uid]?.email ?? "Unknown";
          out.push({ key: uid, label, rows });
        });
    }
    return out;
  }, [filtered, groupBy, profiles]);

  // ---- Member chips for filter ----

  const memberOptions = useMemo(() => {
    return members.map((m) => ({
      id: m.userId,
      profile: profiles[m.userId],
    }));
  }, [members, profiles]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading team work...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
            <span
              className={`inline-flex items-center gap-1 ml-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full border ${
                live
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground border-border"
              }`}
              title={live ? "Realtime connected" : "Realtime disconnected"}
            >
              <CircleDot className={`h-2.5 w-2.5 ${live ? "animate-pulse" : ""}`} />
              {live ? "Live" : "Offline"}
            </span>
          </h1>
          {currentWorkspace && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {currentWorkspace.name} · {projects.length} project
              {projects.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="Tasks not done">
            <Activity className="h-3.5 w-3.5" />
            {stats.active} active
          </span>
          <span className="flex items-center gap-1 text-accent" title="Status: Now">
            <CircleDot className="h-3.5 w-3.5" />
            {stats.inFlight} in flight
          </span>
          <span className="flex items-center gap-1 text-emerald-500" title="Completed today">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {stats.completedToday} today
          </span>
          <span className="flex items-center gap-1" title="Workspace members">
            <Users className="h-3.5 w-3.5" />
            {stats.members}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 text-xs pl-8"
          />
        </div>

        {/* Group by */}
        <div className="inline-flex items-center rounded-xl border border-border bg-muted/50 p-0.5">
          <GroupChip
            active={groupBy === "status"}
            onClick={() => setGroupBy("status")}
            icon={<Layers className="h-3 w-3" />}
            label="Status"
          />
          <GroupChip
            active={groupBy === "project"}
            onClick={() => setGroupBy("project")}
            icon={<FolderKanban className="h-3 w-3" />}
            label="Project"
          />
          <GroupChip
            active={groupBy === "assignee"}
            onClick={() => setGroupBy("assignee")}
            icon={<UserCircle2 className="h-3 w-3" />}
            label="Assignee"
          />
        </div>

        <Button
          variant={showFilters || statusFilter.size < 4 || memberFilter.size > 0 ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2.5 text-xs gap-1.5"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3 w-3" />
          Filters
          {(statusFilter.size !== 4 || memberFilter.size > 0) && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {(statusFilter.size !== 4 ? 1 : 0) + (memberFilter.size > 0 ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="rounded-xl border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Status
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLUMN_ORDER.map((col) => {
                  const on = statusFilter.has(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        const next = new Set(statusFilter);
                        if (on) next.delete(col);
                        else next.add(col);
                        setStatusFilter(next);
                      }}
                      className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                        on
                          ? "bg-accent/10 text-accent border-accent/30"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {COLUMN_LABELS[col]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-2">
                Assignee
                {memberFilter.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setMemberFilter(new Set())}
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                  >
                    <X className="h-2.5 w-2.5" /> clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <MemberChip
                  active={memberFilter.has("unassigned")}
                  onClick={() => {
                    const next = new Set(memberFilter);
                    if (next.has("unassigned")) next.delete("unassigned");
                    else next.add("unassigned");
                    setMemberFilter(next);
                  }}
                  initial="?"
                  label="Unassigned"
                />
                {memberOptions.map((m) => {
                  const label =
                    m.profile?.name ?? m.profile?.email ?? m.id.slice(0, 6);
                  const isMe = m.id === user?.id;
                  return (
                    <MemberChip
                      key={m.id}
                      active={memberFilter.has(m.id)}
                      onClick={() => {
                        const next = new Set(memberFilter);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        setMemberFilter(next);
                      }}
                      initial={(label).slice(0, 1).toUpperCase()}
                      label={isMe ? `${label} (me)` : label}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="pt-6 pb-6 text-sm text-muted-foreground text-center">
            {tasks.length === 0
              ? "No tasks in this workspace yet. Create one from the Board view."
              : "No tasks match your filters."}
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {groups.map((g) => (
        <Card key={g.key} className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-sm font-medium flex items-center gap-2 ${
                g.accent ?? ""
              }`}
            >
              {groupBy === "project" && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: g.rows[0]?.projectColor ?? "#64748b",
                  }}
                />
              )}
              {groupBy === "assignee" && (
                <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center text-[9px] font-medium text-accent shrink-0">
                  {g.label === "Unassigned"
                    ? "?"
                    : g.label.slice(0, 1).toUpperCase()}
                </div>
              )}
              {g.label}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {g.rows.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-0.5">
            {g.rows.map((t) => {
              const assignee = t.assigneeId ? profiles[t.assigneeId] : null;
              const isMine = t.assigneeId === user?.id;
              const recentlyChanged =
                Date.now() - new Date(t.updatedAt).getTime() < 30_000;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    t.projectId && onOpenTask?.(t.projectId, t.id)
                  }
                  className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors ${
                    recentlyChanged ? "ring-1 ring-emerald-500/30" : ""
                  }`}
                >
                  {/* project dot (hidden when grouped by project — already in header) */}
                  {groupBy !== "project" && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.projectColor }}
                      title={t.projectName}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${
                        t.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                      {groupBy !== "project" && <span>{t.projectName}</span>}
                      {groupBy !== "status" && (
                        <>
                          {groupBy !== "project" && <span>·</span>}
                          <span className={COLUMN_ACCENT[t.status]}>
                            {COLUMN_LABELS[t.status]}
                          </span>
                        </>
                      )}
                      {t.due && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(t.due).toLocaleDateString()}
                          </span>
                        </>
                      )}
                      {recentlyChanged && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-500">
                            updated {relativeTime(t.updatedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      PRIORITY_STYLES[t.priority] ?? ""
                    }`}
                  >
                    {t.priority}
                  </Badge>
                  {groupBy !== "assignee" && (
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
                        assignee
                          ? isMine
                            ? "bg-accent text-accent-foreground"
                            : "bg-accent/10 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                      title={
                        assignee
                          ? assignee.name ?? assignee.email
                          : "Unassigned"
                      }
                    >
                      {assignee ? (
                        (assignee.name ?? assignee.email)
                          .slice(0, 1)
                          .toUpperCase()
                      ) : (
                        <UserCircle2 className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GroupChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-lg transition-colors ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MemberChip({
  active,
  onClick,
  initial,
  label,
}: {
  active: boolean;
  onClick: () => void;
  initial: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 h-7 px-2 rounded-lg border text-[11px] transition-colors ${
        active
          ? "bg-accent/10 text-accent border-accent/30"
          : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-medium ${
          active ? "bg-accent text-accent-foreground" : "bg-muted"
        }`}
      >
        {initial}
      </span>
      {label}
    </button>
  );
}
