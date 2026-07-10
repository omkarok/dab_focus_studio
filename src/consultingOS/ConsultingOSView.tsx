// ============================================================
// Consulting OS — the operating-system surface.
// Five tabs mirror the document: Direction (Part I), Pipeline
// (Part III lifecycle), SOPs (Part III library), Nudges (the
// scheduler), and Metrics (Part IV).
// ============================================================

import React from "react";
import { cn } from "@/lib/utils";
import { Compass, Workflow, BookOpen, BellRing, Gauge } from "lucide-react";
import DirectionPanel from "./ui/DirectionPanel";
import PipelinePanel from "./ui/PipelinePanel";
import SopLibraryPanel from "./ui/SopLibraryPanel";
import NudgePanel from "./ui/NudgePanel";
import MetricsPanel from "./ui/MetricsPanel";

export type OsTab = "direction" | "pipeline" | "sops" | "nudges" | "metrics";

const TABS: { key: OsTab; label: string; icon: React.ReactNode }[] = [
  { key: "direction", label: "Direction", icon: <Compass className="h-3.5 w-3.5" /> },
  { key: "pipeline", label: "Pipeline", icon: <Workflow className="h-3.5 w-3.5" /> },
  { key: "sops", label: "SOP Library", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { key: "nudges", label: "Nudges", icon: <BellRing className="h-3.5 w-3.5" /> },
  { key: "metrics", label: "Metrics", icon: <Gauge className="h-3.5 w-3.5" /> },
];

export default function ConsultingOSView({
  tab,
  onTabChange,
  onOpenBoard,
  nudgeCount,
}: {
  tab: OsTab;
  onTabChange: (t: OsTab) => void;
  onOpenBoard: (projectId: string) => void;
  nudgeCount?: number;
}) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Workflow className="h-4 w-4 text-accent" />
          </div>
          <h1 className="text-lg font-semibold">Consulting OS</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          The bots.ai operating system, running. Direction sets the doctrine; the lifecycle,
          SOPs, nudges, and metrics turn every engagement into client results, research, and reusable IP.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {t.icon}
            {t.label}
            {t.key === "nudges" && nudgeCount ? (
              <span className="ml-0.5 rounded-full bg-red-500 text-white text-[9px] px-1.5 py-0.5 leading-none">
                {nudgeCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === "direction" && <DirectionPanel />}
      {tab === "pipeline" && <PipelinePanel onOpenBoard={onOpenBoard} />}
      {tab === "sops" && <SopLibraryPanel onOpenBoard={onOpenBoard} />}
      {tab === "nudges" && <NudgePanel onOpenBoard={onOpenBoard} />}
      {tab === "metrics" && <MetricsPanel />}
    </div>
  );
}
