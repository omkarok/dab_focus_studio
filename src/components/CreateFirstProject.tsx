// ============================================================
// CreateFirstProject — empty-state gate shown when the active
// workspace has no projects yet. Without this gate, the app
// silently falls back to a localStorage-only "default" project
// and tasks never reach the DB or other teammates.
//
// If localStorage tasks exist from prior offline use, offers
// to migrate them into the freshly-created project.
// ============================================================

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/lib/projectContext";
import { useWorkspace } from "@/lib/workspaceContext";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/supabase";
import { newUuid, isUuid } from "@/lib/utils";
import type { Task } from "@/FocusStudioStarter";
import { FolderPlus, Users, Sparkles, AlertCircle, Database } from "lucide-react";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#64748b",
];

const LEGACY_KEYS = ["acs_tasks_default", "focus_studio_state_v1"];

function loadLocalDefaultTasks(): Task[] {
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as Task[];
    } catch {
      /* ignore */
    }
  }
  return [];
}

function clearLocalDefaultTasks(): void {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function CreateFirstProject() {
  const { user } = useAuth();
  const { currentWorkspace, currentTeam, members } = useWorkspace();
  const { addProject, setActiveProject } = useProjects();

  const [name, setName] = useState("");
  const [client, setClient] = useState(currentWorkspace?.name ?? "");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [migrate, setMigrate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  useEffect(() => {
    setLocalTasks(loadLocalDefaultTasks());
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Give the project a name");
      return;
    }
    if (!currentTeam) {
      setError("No team in this workspace yet — try refreshing");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await addProject({
        name: name.trim(),
        client: client.trim() || currentWorkspace?.name || "Workspace",
        color,
      });

      if (migrate && localTasks.length > 0 && user) {
        // Old localStorage tasks have base-36 ids; the DB column is uuid,
        // so regenerate any non-UUID id before upserting.
        const rows = localTasks.map((t) => ({
          id: isUuid(t.id) ? t.id : newUuid(),
          project_id: created.id,
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
          created_by: user.id,
        }));
        const { error: insErr } = await db
          .from("tasks")
          .upsert(rows, { onConflict: "id" });
        if (insErr) throw insErr;
        clearLocalDefaultTasks();
      }

      setActiveProject(created.id);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const otherMembers = members.filter((m) => m.userId !== user?.id);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card className="rounded-2xl">
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create your first project</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tasks live inside projects. Without one, your work stays on
                this device and teammates can't see it.
              </p>
            </div>
          </div>

          {otherMembers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Users className="h-3.5 w-3.5" />
              <span>
                {otherMembers.length} teammate{otherMembers.length === 1 ? "" : "s"} waiting
                to see what you're working on.
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Project name
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
                placeholder="e.g. Q2 AI Strategy"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Client
              </label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={currentWorkspace?.name ?? "Client name"}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                Color
              </label>
              <div className="flex items-center gap-1.5">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "var(--foreground)" : "transparent",
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {localTasks.length > 0 && (
            <label className="flex items-start gap-2 p-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 cursor-pointer">
              <input
                type="checkbox"
                checked={migrate}
                onChange={(e) => setMigrate(e.target.checked)}
                className="mt-0.5 accent-amber-500"
              />
              <div className="text-xs">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <Database className="h-3 w-3" />
                  Migrate {localTasks.length} local task
                  {localTasks.length === 1 ? "" : "s"} into this project
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    recommended
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  Found {localTasks.length} task
                  {localTasks.length === 1 ? "" : "s"} in this browser's offline
                  cache. Migrating uploads them to Supabase so your team can see
                  them.
                </div>
              </div>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button onClick={handleCreate} disabled={submitting || !name.trim()}>
              {submitting ? (
                "Creating..."
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Create project
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
