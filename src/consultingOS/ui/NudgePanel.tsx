// The Nudge system — the next expected action, its owner, deadline,
// and standard, for every engagement. Nobody guesses what is next.
import React, { useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEngagements } from "../engagementContext";
import { useProjects } from "@/lib/projectContext";
import { useWorkspace } from "@/lib/workspaceContext";
import { useTasks } from "@/lib/taskContext";
import { computeNudges } from "../nudges";
import { SeverityDot } from "./shared";
import { BellRing, ArrowRight, User2, CalendarClock } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  "next-action": "Next action",
  "missing-input": "Missing input",
  gate: "Gate",
  "doctrine-breach": "Doctrine breach",
  "harvest-debt": "Harvest debt",
};

export default function NudgePanel({
  onOpenBoard,
}: {
  onOpenBoard: (projectId: string) => void;
}) {
  const { profiles } = useEngagements();
  const { projects, activeProjectId } = useProjects();
  const { profiles: wsProfiles } = useWorkspace();
  const { tasks } = useTasks();

  const projectMeta = useMemo(
    () =>
      Object.fromEntries(
        projects.map((p) => [p.id, { name: p.name, client: p.client, ownerId: p.ownerId }]),
      ),
    [projects],
  );

  const ownerLabel = useCallback(
    (id?: string) =>
      id ? wsProfiles[id]?.name ?? wsProfiles[id]?.email ?? "Owner" : "Unassigned",
    [wsProfiles],
  );

  const nudges = useMemo(
    () =>
      computeNudges({
        profiles,
        projectMeta,
        ownerLabel,
        activeProjectId,
        activeTasks: tasks,
      }),
    [profiles, projectMeta, ownerLabel, activeProjectId, tasks],
  );

  const breaches = nudges.filter((n) => n.severity === "breach").length;
  const overdue = nudges.filter((n) => n.severity === "overdue").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <BellRing className="h-4 w-4 text-accent" />
          {nudges.length} nudge{nudges.length === 1 ? "" : "s"}
        </div>
        {breaches > 0 && <span className="text-red-500">{breaches} doctrine breach{breaches === 1 ? "" : "es"}</span>}
        {overdue > 0 && <span className="text-orange-500">{overdue} overdue</span>}
      </div>

      {nudges.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Nothing pending. Every engagement is inside its timeline and no doctrine threshold is
            breached. Add engagements and run SOPs to see the scheduler work.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nudges.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-border bg-card p-3 flex items-start gap-3"
            >
              <div className="pt-1">
                <SeverityDot severity={n.severity} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {KIND_LABEL[n.kind] ?? n.kind}
                  </span>
                  {n.sopKey && (
                    <span className="font-mono text-[10px] text-accent">{n.sopKey}</span>
                  )}
                  <span className="text-xs font-medium text-foreground truncate">
                    {n.projectName}
                  </span>
                </div>
                <div className="text-sm text-foreground leading-snug">{n.title}</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="italic">Standard:</span> {n.standard}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1">
                    <User2 className="h-3 w-3" /> {n.owner}
                  </span>
                  {n.deadline && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      due {new Date(n.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {n.projectId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => onOpenBoard(n.projectId)}
                >
                  Open <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
