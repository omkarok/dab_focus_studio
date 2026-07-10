// Part IV — the metrics that govern. Live readings from the
// engagement profiles, with each metric's canonical definition,
// review cadence, and threshold behaviour.
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useEngagements } from "../engagementContext";
import { useProjects } from "@/lib/projectContext";
import { computeMetrics } from "../metrics";
import { METRIC_DEFS } from "../os";
import { StatusChip } from "./shared";
import { Gauge, AlertOctagon } from "lucide-react";

export default function MetricsPanel() {
  const { profiles } = useEngagements();
  const { projects } = useProjects();

  const projectMeta = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, { name: p.name, client: p.client }])),
    [projects],
  );

  const readings = useMemo(
    () => computeMetrics({ profiles, projectMeta }),
    [profiles, projectMeta],
  );
  const defByKey = useMemo(
    () => Object.fromEntries(METRIC_DEFS.map((d) => [d.key, d])),
    [],
  );

  const breaches = readings.filter((r) => r.status === "breach");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <Gauge className="h-4 w-4 text-accent" />
        <span className="font-medium">Governing metrics</span>
        <span className="text-muted-foreground">
          computed from {profiles.length} engagement{profiles.length === 1 ? "" : "s"}
        </span>
      </div>

      {breaches.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5">
          <AlertOctagon className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-red-600 dark:text-red-400">
              {breaches.length} threshold breach{breaches.length === 1 ? "" : "es"}
            </span>
            <span className="text-muted-foreground">
              {" "}— {breaches.map((b) => b.name).join(", ")}. These are decisions for the quarterly
              operating review (X4).
            </span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {readings.map((r) => {
          const def = defByKey[r.key];
          return (
            <Card key={r.key} className="rounded-xl">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{r.name}</span>
                  <StatusChip status={r.status} />
                </div>
                <div className="text-2xl font-semibold tabular-nums text-foreground">
                  {r.display}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.note}</p>
                {def && (
                  <div className="pt-2 border-t border-border grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-wider">Definition</span>
                    <span className="text-foreground/80">{def.definition}</span>
                    <span className="uppercase tracking-wider">Review</span>
                    <span className="text-foreground/80">{def.review}</span>
                    <span className="uppercase tracking-wider">Threshold</span>
                    <span className="text-foreground/80">{def.threshold}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
