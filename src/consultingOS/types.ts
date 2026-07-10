// ============================================================
// Consulting OS — canonical types
// ------------------------------------------------------------
// These types encode the bots.ai Operating System (Vision,
// Mission, Doctrine, the SOP library, and the governing metrics)
// as a stable typed spine. Per the operating doctrine, the
// engine stays generic — all engagement variance is data that
// conforms to these types, never a fork of the code.
// ============================================================

// ---- Engagement lifecycle stages (Part III) ----

/** The eight canonical engagement lifecycle stages, E0 → E8. */
export type StageKey =
  | "E0"
  | "E1"
  | "E2"
  | "E3"
  | "E4"
  | "E5"
  | "E6"
  | "E7"
  | "E8";

/** The four cross-cutting SOPs (the research/governance spine). */
export type CrossCuttingKey = "X1" | "X2" | "X3" | "X4";

export type SopKey = StageKey | CrossCuttingKey;

/** Every SOP step is performed either by an AI system or a human. */
export type ActorRole = "AI-EXEC" | "HUMAN";

/** Gates are checked by a verifier agent or reserved for a human. */
export type GateType = "AI-VERIFY" | "HUMAN-GATE";

/** Deployment lane per the lane-selection skill. */
export type Lane =
  | "Undetermined"
  | "Lane 1"
  | "Lane 2"
  | "Lane 3";

/** Data-boundary posture discovered in E1 (never assumed). */
export type BoundaryPosture =
  | "unknown"
  | "on-prem"
  | "private-cloud"
  | "public-cloud";

/** Estimation confidence — High only when every gate is confirmed. */
export type EstimateConfidence = "High" | "Medium" | "Low";

// ---- SOP definition (the canonical schema, Part II §5) ----

export interface SopStep {
  /** [AI-EXEC] = executor agent with the named skill; [HUMAN] = judgment call. */
  role: ActorRole;
  text: string;
  /** Named Agent Skill the executor loads for this step, if any. */
  skill?: string;
}

export interface SopGate {
  /** [AI-VERIFY] gates are checked by a verifier agent; [HUMAN-GATE] cannot be delegated. */
  type: GateType;
  description: string;
}

/**
 * A single SOP written to the canonical schema so it can be executed
 * and verified by AI systems, not just read by humans.
 */
export interface Sop {
  key: SopKey;
  /** Display code, e.g. "E0", "X1". */
  code: string;
  name: string;
  kind: "lifecycle" | "cross-cutting";
  /** Ordering within its kind. */
  order: number;
  /** For lifecycle SOPs, the stage the engagement is in while running it. */
  stage?: StageKey;
  /** One-line intent. */
  purpose: string;
  trigger: string;
  inputs: string[];
  steps: SopStep[];
  outputs: string[];
  /** Definition of done, as checkable assertions. */
  standard: string[];
  timeline: string;
  /** Elapsed-time budget in days, used by the nudge scheduler. */
  timelineDays: number;
  gate: SopGate;
  failurePath: string;
}

// ---- Direction (Part I) ----

export interface Doctrine {
  n: number;
  title: string;
  body: string;
}

export interface FlywheelNode {
  id: string;
  label: string;
  detail: string;
}

// ---- Governing metrics (Part IV) ----

export interface MetricDef {
  key: MetricKey;
  name: string;
  definition: string;
  review: string;
  threshold: string;
}

export type MetricKey =
  | "decoupling"
  | "grossMargin"
  | "concentration"
  | "estimateCalibration"
  | "taxonomyGrowth"
  | "ipLeverage"
  | "harvestDebt"
  | "publishing";

/** A computed metric with its live value and threshold status. */
export interface MetricReading {
  key: MetricKey;
  name: string;
  /** Human-readable current value, or "unmeasured". */
  display: string;
  /** Raw numeric value when measurable, else null. */
  value: number | null;
  status: "ok" | "watch" | "breach" | "unmeasured";
  /** Why the status is what it is. */
  note: string;
}

// ---- Engagement profile (per project / client engagement) ----

export interface DisagreeCommitEntry {
  id: string;
  risk: string;
  /** True while the compromise is scoped to the pilot only. */
  scopedToPilot: boolean;
  /** The dated, named production decision (E6). Empty = still open. */
  productionDecision?: string;
  createdAt: string;
}

export interface IpAsset {
  id: string;
  name: string;
  kind: "skill" | "orggpt-core" | "harness" | "adapter";
  reuseCount: number;
  /** Engagement-hours saved by reuse — the numerator of the decoupling ratio. */
  hoursSaved: number;
}

export interface VerificationResult {
  status: "pass" | "fail" | "unrun";
  /** Findings are themselves traces in the failure schema. */
  findings: string[];
  checkedAt: string;
  verifier: "ai" | "deterministic";
}

export interface SopRunRecord {
  id: string;
  sopKey: SopKey;
  startedAt: string;
  /** Ids of the board tasks this run seeded. */
  taskIds: string[];
  verification?: VerificationResult;
}

export interface HarvestRecord {
  taxonomyDelta: boolean;
  ipCaptured: boolean;
  published: boolean;
  metricsVerified: boolean;
  updatedAt: string;
}

/**
 * The declarative, per-engagement state layered on top of a Project.
 * The engine reads/writes this; it never special-cases a client.
 */
export interface EngagementProfile {
  projectId: string;
  stage: StageKey;
  /** When the engagement entered its current stage — drives nudge deadlines. */
  stageEnteredAt: string;
  lane: Lane;
  boundaryPosture: BoundaryPosture;
  estimateConfidence: EstimateConfidence;

  // Commercial (Part IV inputs) — numeric or explicitly left unmeasured.
  trailingRevenue?: number;
  grossMarginPct?: number;
  /** % of this engagement's revenue that scales with deployments, not architect-hours. */
  deploymentLinkedPct?: number;

  // Research / IP spine
  failureClasses: string[];
  ipAssets: IpAsset[];
  publications: number;

  // Records
  sopRuns: SopRunRecord[];
  disagreeCommit: DisagreeCommitEntry[];
  harvest?: HarvestRecord;
  notes?: string;
}

// ---- Nudges (the scheduler that says what's next) ----

export type NudgeSeverity = "info" | "due-soon" | "overdue" | "breach";
export type NudgeKind =
  | "next-action"
  | "missing-input"
  | "gate"
  | "doctrine-breach"
  | "harvest-debt";

export interface Nudge {
  id: string;
  projectId: string;
  projectName: string;
  sopKey?: SopKey;
  /** The next expected action. */
  title: string;
  /** Responsible person (name or email). */
  owner: string;
  /** ISO deadline, when one applies. */
  deadline?: string;
  /** The standard this action must meet — its definition of done. */
  standard: string;
  severity: NudgeSeverity;
  kind: NudgeKind;
}
