// ============================================================
// Consulting OS — the metrics that govern (Part IV)
// ------------------------------------------------------------
// Computes live readings for each governing metric from the
// engagement profiles. Where the inputs do not exist, the metric
// reads "unmeasured" rather than a fabricated number — doctrine
// #1: numeric or explicitly unmeasured, never false precision.
// ============================================================

import type { EngagementProfile, MetricReading } from "./types";
import {
  CONCENTRATION_CEILING_PCT,
  HARVEST_WINDOW_DAYS,
  HARVEST_DEBT_ESCALATION_DAYS,
} from "./os";

const DAY_MS = 24 * 60 * 60 * 1000;
function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

export interface MetricInput {
  profiles: EngagementProfile[];
  projectMeta: Record<string, { name: string; client: string }>;
  now?: Date;
}

export function computeMetrics(input: MetricInput): MetricReading[] {
  const { profiles, projectMeta, now = new Date() } = input;
  const readings: MetricReading[] = [];

  // ---- Decoupling ratio ----
  {
    const withData = profiles.filter((p) => typeof p.deploymentLinkedPct === "number");
    if (withData.length === 0) {
      readings.push(unmeasured("decoupling", "Decoupling ratio", "No engagement has recorded its deployment-linked revenue share yet."));
    } else {
      // Revenue-weighted when revenue is present, else simple average.
      const haveRev = withData.every((p) => typeof p.trailingRevenue === "number" && p.trailingRevenue! > 0);
      let value: number;
      if (haveRev) {
        const totalRev = withData.reduce((s, p) => s + (p.trailingRevenue as number), 0);
        value = withData.reduce((s, p) => s + (p.deploymentLinkedPct as number) * (p.trailingRevenue as number), 0) / totalRev;
      } else {
        value = withData.reduce((s, p) => s + (p.deploymentLinkedPct as number), 0) / withData.length;
      }
      readings.push({
        key: "decoupling",
        name: "Decoupling ratio",
        display: `${value.toFixed(0)}%`,
        value,
        status: "ok",
        note: "Trend it quarterly; flat for two quarters triggers a strategy review.",
      });
    }
  }

  // ---- Gross margin per account ----
  {
    const withData = profiles.filter((p) => typeof p.grossMarginPct === "number");
    if (withData.length === 0) {
      readings.push(unmeasured("grossMargin", "Gross margin per account", "No engagement has a recorded gross margin yet."));
    } else {
      const avg = withData.reduce((s, p) => s + (p.grossMarginPct as number), 0) / withData.length;
      readings.push({
        key: "grossMargin",
        name: "Gross margin per account",
        display: `${avg.toFixed(0)}% avg · ${withData.length} account${withData.length === 1 ? "" : "s"}`,
        value: avg,
        status: "ok",
        note: "Pilot and production kept separate; threshold is set at the quarterly review.",
      });
    }
  }

  // ---- Concentration ----
  {
    const revenueByClient: Record<string, number> = {};
    let total = 0;
    for (const p of profiles) {
      const meta = projectMeta[p.projectId];
      if (!meta || typeof p.trailingRevenue !== "number") continue;
      revenueByClient[meta.client] = (revenueByClient[meta.client] ?? 0) + p.trailingRevenue;
      total += p.trailingRevenue;
    }
    if (total <= 0) {
      readings.push(unmeasured("concentration", "Concentration", "No trailing-revenue figures recorded on engagements yet."));
    } else {
      const sorted = Object.entries(revenueByClient).sort((a, b) => b[1] - a[1]);
      const [topClient, topRev] = sorted[0];
      const share = (topRev / total) * 100;
      readings.push({
        key: "concentration",
        name: "Concentration",
        display: `${share.toFixed(0)}% · ${topClient}`,
        value: share,
        status: share > CONCENTRATION_CEILING_PCT ? "breach" : "ok",
        note:
          share > CONCENTRATION_CEILING_PCT
            ? `Above the ${CONCENTRATION_CEILING_PCT}% ceiling — needs a time-boxed exception or pipeline action.`
            : `Largest client share of trailing revenue. Ceiling is ${CONCENTRATION_CEILING_PCT}%.`,
      });
    }
  }

  // ---- Estimate calibration ----
  {
    // Requires backtested estimate-vs-actual deltas from harvest; not tracked numerically yet.
    readings.push(unmeasured("estimateCalibration", "Estimate calibration", "Needs backtested effort deltas captured at harvest (E8)."));
  }

  // ---- Taxonomy growth ----
  {
    const classes = new Set<string>();
    let traceFindings = 0;
    for (const p of profiles) {
      p.failureClasses.forEach((c) => classes.add(c));
      p.sopRuns.forEach((r) => {
        if (r.verification) traceFindings += r.verification.findings.length;
      });
    }
    const count = classes.size;
    readings.push({
      key: "taxonomyGrowth",
      name: "Taxonomy growth",
      display: `${count} adjudicated class${count === 1 ? "" : "es"} · ${traceFindings} verifier finding${traceFindings === 1 ? "" : "s"}`,
      value: count,
      status: count === 0 ? "watch" : "ok",
      note: count === 0 ? "Zero growth triggers an instrumentation audit." : "Adjudicate candidate classes monthly so the taxonomy stays comparable.",
    });
  }

  // ---- IP leverage ----
  {
    let hoursSaved = 0;
    let assets = 0;
    let reuse = 0;
    for (const p of profiles) {
      for (const a of p.ipAssets) {
        assets += 1;
        hoursSaved += a.hoursSaved;
        reuse += a.reuseCount;
      }
    }
    if (assets === 0) {
      readings.push(unmeasured("ipLeverage", "IP leverage", "No reusable assets captured yet (X2)."));
    } else {
      readings.push({
        key: "ipLeverage",
        name: "IP leverage",
        display: `${hoursSaved} hrs saved · ${assets} asset${assets === 1 ? "" : "s"} · ${reuse} reuses`,
        value: hoursSaved,
        status: "ok",
        note: "Engagement-hours saved by reuse feeds the numerator of the decoupling ratio.",
      });
    }
  }

  // ---- Harvest debt ----
  {
    let overdue = 0;
    let maxDays = 0;
    for (const p of profiles) {
      if (p.stage !== "E8") continue;
      const h = p.harvest;
      const complete = h && h.taxonomyDelta && h.ipCaptured && h.published && h.metricsVerified;
      if (complete) continue;
      const over = daysSince(p.stageEnteredAt, now) - HARVEST_WINDOW_DAYS;
      if (over > 0) {
        overdue += 1;
        maxDays = Math.max(maxDays, over);
      }
    }
    readings.push({
      key: "harvestDebt",
      name: "Harvest debt",
      display: overdue === 0 ? "0 overdue" : `${overdue} overdue · max ${maxDays}d`,
      value: overdue,
      status: maxDays > HARVEST_DEBT_ESCALATION_DAYS ? "breach" : overdue > 0 ? "watch" : "ok",
      note:
        maxDays > HARVEST_DEBT_ESCALATION_DAYS
          ? "Past 30 days — escalate. Harvest debt is tracked like technical debt."
          : "Harvest closes within two weeks of its trigger.",
    });
  }

  // ---- Publishing cadence ----
  {
    const pieces = profiles.reduce((s, p) => s + (p.publications ?? 0), 0);
    readings.push({
      key: "publishing",
      name: "Publishing cadence",
      display: `${pieces} piece${pieces === 1 ? "" : "s"} logged`,
      value: pieces,
      status: pieces < 1 ? "watch" : "ok",
      note: pieces < 1 ? "Minimum one substantive piece per quarter; below that it is allocated in the next capital split." : "Publish only what deployment access uniquely produces.",
    });
  }

  return readings;
}

function unmeasured(key: MetricReading["key"], name: string, note: string): MetricReading {
  return { key, name, display: "unmeasured", value: null, status: "unmeasured", note };
}
