// Shared presentational bits for the Consulting OS views.
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActorRole, GateType, StageKey, NudgeSeverity } from "../types";
import { STAGE_LABELS } from "../os";
import { Bot, User, ShieldCheck, Gavel } from "lucide-react";

export function RoleChip({ role }: { role: ActorRole }) {
  const ai = role === "AI-EXEC";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
        ai
          ? "bg-accent/10 text-accent border-accent/30"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      )}
    >
      {ai ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role}
    </span>
  );
}

export function GateChip({ type }: { type: GateType }) {
  const verify = type === "AI-VERIFY";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
        verify
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
      )}
    >
      {verify ? <ShieldCheck className="h-3 w-3" /> : <Gavel className="h-3 w-3" />}
      {type}
    </span>
  );
}

export function StageBadge({ stage, muted }: { stage: StageKey; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
        muted ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent",
      )}
    >
      <span className="font-mono">{stage}</span>
      <span className="opacity-70">{STAGE_LABELS[stage]}</span>
    </span>
  );
}

const SEVERITY_STYLES: Record<NudgeSeverity, string> = {
  breach: "bg-red-500",
  overdue: "bg-orange-500",
  "due-soon": "bg-amber-500",
  info: "bg-muted-foreground/40",
};

export function SeverityDot({ severity }: { severity: NudgeSeverity }) {
  return <span className={cn("h-2 w-2 rounded-full shrink-0", SEVERITY_STYLES[severity])} />;
}

export function StatusChip({
  status,
}: {
  status: "ok" | "watch" | "breach" | "unmeasured";
}) {
  const styles: Record<string, string> = {
    ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    watch: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    breach: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    unmeasured: "bg-muted text-muted-foreground border-border",
  };
  const label: Record<string, string> = {
    ok: "On track",
    watch: "Watch",
    breach: "Breach",
    unmeasured: "Unmeasured",
  };
  return (
    <Badge className={cn("border text-[10px] font-medium", styles[status])}>{label[status]}</Badge>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {children}
    </h3>
  );
}
