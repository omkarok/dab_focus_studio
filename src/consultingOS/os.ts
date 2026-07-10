// ============================================================
// Consulting OS — Direction (Part I) + Governing Metrics (Part IV)
// ------------------------------------------------------------
// The canonical, client-agnostic content of the bots.ai
// Operating System. This is the "spine"; the SOP library
// (sops.ts) is the executable form. When a skill and this
// spine disagree, the skill is stale — the spine is canonical.
// ============================================================

import type {
  Doctrine,
  FlywheelNode,
  MetricDef,
  StageKey,
  Lane,
} from "./types";

export const OS_VERSION = "1.0";

export const VISION =
  "Every enterprise workflow that can be safely delegated to an AI system, is — and the field trusts the taxonomy we built to say which ones can't be yet.";

export const VISION_DETAIL =
  "The end state is not a successful consultancy. It is a research lab whose consulting practice is the instrument: real deployments in legacy-hostile enterprise environments generate the failure data no frontier lab can replicate, and that data compounds into the most credible benchmark for enterprise agent reliability that exists.";

export const MISSION =
  "Deploy production AI agent systems inside real enterprises, own the outcomes end-to-end, instrument every failure against a consistent schema, and convert that evidence into three compounding assets: client results, published research, and reusable platform IP.";

export const MISSION_DETAIL =
  "Every engagement must feed all three. An engagement that produces only revenue is a leak.";

/** The seven operating doctrines — the mechanisms that make growth non-optional. */
export const NON_NEGOTIABLES: Doctrine[] = [
  {
    n: 1,
    title: "Reality contact before elaboration",
    body: "No plan, estimate, or architecture survives past its first validation gate unvalidated. Detail earned through backtesting beats detail produced by planning.",
  },
  {
    n: 2,
    title: "Evidence-gated capital",
    body: "No infrastructure ownership, hiring, or platform investment without utilization or demand data that triggers it. Rent until the trace store says buy. Data residency — not cost projections — triggers ownership.",
  },
  {
    n: 3,
    title: "Externalize variance, keep the core generic",
    body: "Client-specific logic lives in declarative layers (norms-as-data, semantic mappings, persona packs, config). The engine never forks. This applies to code, to SOPs, and to this document.",
  },
  {
    n: 4,
    title: "Own outcomes, not diagnostics",
    body: "We are the execution-ownership model. We run pilots, carry delivery risk, and stay through production. The diagnostic-and-exit model is the competitor's shape, never ours.",
  },
  {
    n: 5,
    title: "Instrument everything",
    body: "Every agent run emits traces in the canonical failure schema from the first pilot run. An uninstrumented deployment is an unfinished deployment.",
  },
  {
    n: 6,
    title: "Disagree and commit, in writing",
    body: "When a client forces a technically inferior path, we name every risk in a written record, scope it to the pilot, and keep the production decision explicitly business-owned. We never silently absorb architectural risk.",
  },
  {
    n: 7,
    title: "The decoupling ratio must move",
    body: "Percentage of revenue that scales with deployments rather than architect-hours is reviewed quarterly. Flat for two consecutive quarters triggers a strategy review, not a shrug.",
  },
];

/** The flywheel — services margin funds platform IP and research; both drive inbound trust. */
export const FLYWHEEL: FlywheelNode[] = [
  {
    id: "engagement",
    label: "Services engagement",
    detail: "Revenue-funded, margin-positive. Services gross margin is the investment budget — we are our own VC.",
  },
  {
    id: "deployment",
    label: "Instrumented deployment",
    detail: "Traces feed the failure taxonomy from the first pilot run.",
  },
  {
    id: "ip",
    label: "Platform IP",
    detail: "OrgGPT core, skills, harness patterns → cheaper/faster next engagement (config, not code).",
  },
  {
    id: "research",
    label: "Published research",
    detail: "Taxonomy, benchmarks, essays — what our deployment access uniquely produces.",
  },
  {
    id: "trust",
    label: "Inbound trust",
    detail: "Better clients, zero paid acquisition. Distribution of profit is what's left after the flywheel is fed.",
  },
];

/** Concentration ceiling: no single client above this share of trailing-6-mo revenue. */
export const CONCENTRATION_CEILING_PCT = 40;

/** Harvest must close within this window of its trigger. */
export const HARVEST_WINDOW_DAYS = 14;

/** Harvest debt escalation threshold. */
export const HARVEST_DEBT_ESCALATION_DAYS = 30;

// ---- Stage metadata ----

export const STAGE_LABELS: Record<StageKey, string> = {
  E0: "Qualify",
  E1: "Discover",
  E2: "Scope & Price",
  E3: "Architect",
  E4: "Pilot Build",
  E5: "Pilot Run",
  E6: "Production Decision",
  E7: "Operate",
  E8: "Harvest",
};

export const STAGE_ORDER: StageKey[] = [
  "E0",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
  "E8",
];

export const LANES: Lane[] = ["Undetermined", "Lane 1", "Lane 2", "Lane 3"];

// ---- Governing metrics (Part IV) ----

export const METRIC_DEFS: MetricDef[] = [
  {
    key: "decoupling",
    name: "Decoupling ratio",
    definition: "% of revenue scaling with deployments, not architect-hours.",
    review: "Quarterly",
    threshold: "Flat 2 quarters → strategy review.",
  },
  {
    key: "grossMargin",
    name: "Gross margin per account",
    definition: "Per lane-selection commercial formulas, pilot and production separated.",
    review: "Monthly",
    threshold: "Below threshold 2 months → re-price / re-lane.",
  },
  {
    key: "concentration",
    name: "Concentration",
    definition: "Largest client % of trailing-6-month revenue.",
    review: "Quarterly",
    threshold: "> 40% → explicit time-boxed exception or pipeline action.",
  },
  {
    key: "estimateCalibration",
    name: "Estimate calibration",
    definition: "Backtested effort delta vs. actuals.",
    review: "Per harvest",
    threshold: "Drift > 0.5 PM → rubric recalibration.",
  },
  {
    key: "taxonomyGrowth",
    name: "Taxonomy growth",
    definition: "New adjudicated failure classes + trace volume by environment.",
    review: "Quarterly",
    threshold: "Zero growth → instrumentation audit.",
  },
  {
    key: "ipLeverage",
    name: "IP leverage",
    definition: "Engagement-hours saved by reused assets.",
    review: "Quarterly",
    threshold: "Feeds the decoupling ratio.",
  },
  {
    key: "harvestDebt",
    name: "Harvest debt",
    definition: "Engagements past the 2-week harvest window.",
    review: "Weekly nudge",
    threshold: "> 30 days → escalation.",
  },
  {
    key: "publishing",
    name: "Publishing cadence",
    definition: "Substantive pieces per quarter.",
    review: "Quarterly",
    threshold: "< 1 → allocated in next quarter's capital split.",
  },
];
