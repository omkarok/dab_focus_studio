// ============================================================
// Consulting OS — the Nudge system (three-role architecture, role 3)
// ------------------------------------------------------------
// A scheduler over SOP triggers, timelines, and missing inputs.
// For every engagement it computes the next expected action, its
// owner, its deadline, and its standard, so nobody guesses what
// is next — the system says so. It also raises doctrine breaches
// (concentration, missing lane before pricing, harvest debt).
// ============================================================

import type { Task } from "@/FocusStudioStarter";
import type { EngagementProfile, Nudge, NudgeSeverity } from "./types";
import { sopForStage } from "./sops";
import {
  STAGE_ORDER,
  CONCENTRATION_CEILING_PCT,
  HARVEST_WINDOW_DAYS,
  HARVEST_DEBT_ESCALATION_DAYS,
} from "./os";

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;

function addDays(iso: string, days: number): Date {
  return new Date(new Date(iso).getTime() + days * DAY_MS);
}
function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}
function deadlineSeverity(deadline: Date, now: Date): NudgeSeverity {
  const diffDays = (deadline.getTime() - now.getTime()) / DAY_MS;
  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_DAYS) return "due-soon";
  return "info";
}

const SEVERITY_RANK: Record<NudgeSeverity, number> = {
  breach: 0,
  overdue: 1,
  "due-soon": 2,
  info: 3,
};

export interface ComputeNudgesParams {
  profiles: EngagementProfile[];
  projectMeta: Record<string, { name: string; client: string; ownerId?: string }>;
  ownerLabel: (id?: string) => string;
  /** The active project, whose real task state refines its next action. */
  activeProjectId?: string;
  activeTasks?: Task[];
  now?: Date;
}

export function computeNudges(params: ComputeNudgesParams): Nudge[] {
  const { profiles, projectMeta, ownerLabel, activeProjectId, activeTasks = [], now = new Date() } = params;
  const nudges: Nudge[] = [];

  for (const profile of profiles) {
    const meta = projectMeta[profile.projectId];
    if (!meta) continue; // project no longer exists
    const projectName = meta.name;
    const owner = ownerLabel(meta.ownerId);
    const stageIndex = STAGE_ORDER.indexOf(profile.stage);
    const sop = sopForStage(profile.stage);

    // ---- Primary next-action / gate nudge from the current stage's SOP ----
    if (sop) {
      const deadline = addDays(profile.stageEnteredAt, sop.timelineDays);
      const runs = profile.sopRuns.filter((r) => r.sopKey === sop.key);
      const latestRun = runs[runs.length - 1];

      let title: string;
      let kind: Nudge["kind"] = "next-action";

      if (latestRun && activeProjectId === profile.projectId) {
        const runTasks = activeTasks.filter((t) => latestRun.taskIds.includes(t.id));
        const firstOpen = runTasks.find((t) => !t.completed);
        if (firstOpen) {
          title = firstOpen.title;
        } else {
          title = `Clear the ${sop.code} gate (${sop.gate.type})`;
          kind = "gate";
        }
      } else if (latestRun) {
        title = `Advance ${sop.code} ${sop.name} to its gate`;
      } else {
        title = `Run ${sop.code} ${sop.name}: ${sop.purpose}`;
      }

      nudges.push({
        id: `next:${profile.projectId}`,
        projectId: profile.projectId,
        projectName,
        sopKey: sop.key,
        title,
        owner,
        deadline: deadline.toISOString(),
        standard: sop.standard.join(" "),
        severity: deadlineSeverity(deadline, now),
        kind,
      });
    }

    // ---- Missing input: lane / boundary must be closed before pricing (E2+) ----
    if (stageIndex >= STAGE_ORDER.indexOf("E2")) {
      const unresolved: string[] = [];
      if (profile.lane === "Undetermined") unresolved.push("lane");
      if (profile.boundaryPosture === "unknown") unresolved.push("data-boundary posture");
      if (unresolved.length > 0) {
        nudges.push({
          id: `missing:${profile.projectId}`,
          projectId: profile.projectId,
          projectName,
          title: `Resolve ${unresolved.join(" and ")} — a lane-flipping unknown is still open past E1`,
          owner,
          standard:
            "No inferred hosting models or APIs. Every system-of-record answer is sourced from the client; lane confirmed before pricing.",
          severity: "breach",
          kind: "missing-input",
        });
      }
    }

    // ---- Disagree-and-commit: open items must be closed at E6 ----
    if (profile.stage === "E6") {
      const open = profile.disagreeCommit.filter((d) => !d.productionDecision);
      if (open.length > 0) {
        nudges.push({
          id: `dc:${profile.projectId}`,
          projectId: profile.projectId,
          projectName,
          title: `Close ${open.length} open disagree-and-commit item${open.length === 1 ? "" : "s"} with a dated production decision`,
          owner,
          standard: "Every pilot compromise has a dated production decision with a named decider. Silence is not carrying forward.",
          severity: "breach",
          kind: "doctrine-breach",
        });
      }
    }

    // ---- Harvest debt: E8 with incomplete harvest past the 2-week window ----
    if (profile.stage === "E8") {
      const h = profile.harvest;
      const complete = h && h.taxonomyDelta && h.ipCaptured && h.published && h.metricsVerified;
      if (!complete) {
        const overdueDays = daysSince(profile.stageEnteredAt, now) - HARVEST_WINDOW_DAYS;
        if (overdueDays > 0) {
          nudges.push({
            id: `harvest:${profile.projectId}`,
            projectId: profile.projectId,
            projectName,
            sopKey: "E8",
            title: `Harvest is ${overdueDays}d past its window — extract taxonomy, IP, and publishable findings`,
            owner,
            standard: "An engagement closing with only revenue logged fails the harvest gate. All three flywheel outputs must exist.",
            severity: overdueDays > HARVEST_DEBT_ESCALATION_DAYS ? "breach" : "due-soon",
            kind: "harvest-debt",
          });
        }
      }
    }
  }

  // ---- Concentration breach across the portfolio (doctrine, F&O-regulation exposure) ----
  const revenueByClient: Record<string, number> = {};
  let totalRevenue = 0;
  for (const profile of profiles) {
    const meta = projectMeta[profile.projectId];
    if (!meta || typeof profile.trailingRevenue !== "number") continue;
    revenueByClient[meta.client] = (revenueByClient[meta.client] ?? 0) + profile.trailingRevenue;
    totalRevenue += profile.trailingRevenue;
  }
  if (totalRevenue > 0) {
    const [topClient, topRevenue] = Object.entries(revenueByClient).sort((a, b) => b[1] - a[1])[0];
    const share = (topRevenue / totalRevenue) * 100;
    if (share > CONCENTRATION_CEILING_PCT) {
      const anchor = profiles.find((p) => projectMeta[p.projectId]?.client === topClient);
      nudges.push({
        id: `concentration:${topClient}`,
        projectId: anchor?.projectId ?? "",
        projectName: topClient,
        title: `Client concentration is ${share.toFixed(0)}% of trailing revenue — above the ${CONCENTRATION_CEILING_PCT}% ceiling`,
        owner: "Founders",
        standard: `No single client above ${CONCENTRATION_CEILING_PCT}% without an explicit, time-boxed exception ratified at the quarterly review.`,
        severity: "breach",
        kind: "doctrine-breach",
      });
    }
  }

  nudges.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return ad - bd;
  });

  return nudges;
}
