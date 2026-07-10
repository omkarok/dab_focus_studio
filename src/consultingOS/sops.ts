// ============================================================
// Consulting OS — the SOP Library (Part III)
// ------------------------------------------------------------
// The engagement lifecycle E0 → E8 plus the cross-cutting SOPs
// X1–X4. Each SOP is written to the canonical schema so it can
// be executed by an executor agent, checked by a verifier
// agent, and scheduled by the nudge system. Steps tagged
// AI-EXEC are the mechanical 80%; HUMAN steps are the judgment
// that was always meant to be scarce. Every SOP is designed to
// graduate: document → skill → verified skill.
// ============================================================

import type { Sop } from "./types";

export const SOPS: Sop[] = [
  // ---------------------------------------------------------
  // E0 — Lead Qualification
  // ---------------------------------------------------------
  {
    key: "E0",
    code: "E0",
    name: "Lead Qualification",
    kind: "lifecycle",
    order: 0,
    stage: "E0",
    purpose: "Decide whether a lead is an execution-ownership buyer worth pipeline time.",
    trigger: "Inbound inquiry, referral, or event lead lands in the intake system.",
    inputs: ["Contact record with source tag (QR/UTM source-tracking where applicable)."],
    steps: [
      {
        role: "AI-EXEC",
        text: "Enrich: company profile, sector, likely systems of record, probable data-boundary posture (Indian enterprise defaults: assume on-prem or private-cloud ERP until proven otherwise).",
        skill: "lead-enrichment",
      },
      {
        role: "AI-EXEC",
        text: "Score against fit rubric: (a) execution-ownership buyer vs. report buyer, (b) workflow with measurable baseline, (c) access realism (will IT grant integration paths?), (d) research value (does this environment add novel failure surface to the taxonomy?).",
        skill: "fit-scoring",
      },
      {
        role: "HUMAN",
        text: "Founder/architect reviews score and decides to pursue / decline / refer.",
      },
    ],
    outputs: ["Qualification memo (1 page)", "Fit score", "Decline note if declined"],
    standard: [
      "Every declined lead has a one-line reason logged.",
      "Every pursued lead has all four rubric dimensions scored with evidence, not vibes.",
    ],
    timeline: "3 business days from trigger.",
    timelineDays: 3,
    gate: {
      type: "HUMAN-GATE",
      description: "Pursue decision. AI may recommend; only a human commits pipeline time.",
    },
    failurePath:
      "Score < threshold on (a) or (c) → decline with referral where possible. Report-buyers get pointed at diagnostic firms; we do not become one for revenue.",
  },

  // ---------------------------------------------------------
  // E1 — Discovery & Baseline
  // ---------------------------------------------------------
  {
    key: "E1",
    code: "E1",
    name: "Discovery & Baseline",
    kind: "lifecycle",
    order: 1,
    stage: "E1",
    purpose: "Establish a sourced baseline and close (or flag) every lane-flipping unknown.",
    trigger: "Pursue decision from E0.",
    inputs: ["Qualification memo", "Client stakeholder list", "Signed NDA"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Generate the discovery question set from the lane-selection skill's mandatory preflight: system-of-record gate (which system, where hosted, how accessed, reachability, credential boundaries, write authority), orchestration/data gate (trace egress rules, DPDP/GDPR/contractual constraints, key ownership), scale/ownership gate (volumes, peaks, deadlines, operating owner, cost payer).",
        skill: "lane-selection",
      },
      {
        role: "HUMAN",
        text: "Run discovery sessions with business + IT + (where write access is at stake) CTO/CISO. Architects run these; they are not delegable because boundary answers are political as much as technical.",
      },
      {
        role: "AI-EXEC",
        text: "Compile: current-process baseline (cycle time, error rate, cost per transaction, volumes), systems map, risk register, and the explicit list of lane-flipping unknowns still open.",
      },
      {
        role: "AI-EXEC",
        text: "Verifier checks the discovery pack against the preflight: any workflow touching a system of record without a completed gate = fail.",
        skill: "preflight-verify",
      },
    ],
    outputs: [
      "Discovery pack",
      "Baseline metrics sheet",
      "Open-questions register with lane impact per question",
    ],
    standard: [
      "No inferred hosting models or APIs — every system-of-record answer is sourced from the client, not assumed from sector or company size.",
      "Baseline metrics are numeric or explicitly marked unmeasured.",
      "Lane-flipping unknowns appear at the top of the pack, never buried in assumptions.",
    ],
    timeline: "2–3 weeks.",
    timelineDays: 21,
    gate: {
      type: "AI-VERIFY",
      description:
        "Preflight completeness → then HUMAN-GATE: client sponsor confirms scope and baseline in writing.",
    },
    failurePath:
      "Unresolvable access unknowns → engagement proceeds only as Provisional with conditional architecture (If A → Lane X; If B → Lane Y), and pricing carries the uncertainty premium (see E2).",
  },

  // ---------------------------------------------------------
  // E2 — Scoping, Costing & Commercial Proposal
  // ---------------------------------------------------------
  {
    key: "E2",
    code: "E2",
    name: "Scoping, Costing & Commercial Proposal",
    kind: "lifecycle",
    order: 2,
    stage: "E2",
    purpose: "Produce a margin-positive, honestly-scoped, backtested proposal.",
    trigger: "Discovery pack accepted.",
    inputs: ["Discovery pack", "Baseline sheet", "Open-questions register"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Run the ai-agent-costing skill: two-layer output — labour-only quote and full TCO layer — with the multiplicative complexity rubric applied per use case (integration brittleness, data readiness, compliance surface, novelty as multiplicative criticality, additive scope kept separate).",
        skill: "ai-agent-costing",
      },
      {
        role: "AI-EXEC",
        text: "Run the lane-selection skill: recommended lane per the decision algorithm, stage-by-stage CAPEX/OPEX (Stages 0–7 kept distinct), P50/P90, cost ownership split, margin, break-even for any migration path.",
        skill: "lane-selection",
      },
      {
        role: "AI-EXEC",
        text: "Verifier asserts: pilot CAPEX and pilot OPEX are separated; no single blended build+run number; cost-per-attempted-task and cost-per-successful-task present; every material CAPEX line has quantity, unit, rate, payer, P50, P90; confidence matches the number of unresolved gates; no fabricated vendor prices.",
        skill: "costing-verify",
      },
      {
        role: "AI-EXEC",
        text: "Backtest the estimate against the closest historical engagement in the trace store (Nuvama/ADM-class comparison). Deviation > 0.5 PM from the analog without a stated structural reason = flag.",
      },
      {
        role: "HUMAN",
        text: "Architect sets the commercial position: price, payment structure, pilot-scoped commitments, and the written risk register for any client-forced constraint (the disagree-and-commit record).",
      },
    ],
    outputs: [
      "Costed proposal",
      "Internal margin model",
      "Disagree-and-commit register (if applicable)",
    ],
    standard: [
      "Estimation confidence is High only when system, boundary, integration, volume, rates, payer, and owner are all confirmed.",
      "Anything less is Medium/Low and is priced with explicit ranges, never false precision.",
    ],
    timeline: "1 week from discovery acceptance.",
    timelineDays: 7,
    gate: {
      type: "HUMAN-GATE",
      description:
        "Internal margin review (target gross margin threshold set at quarterly review) → client signature.",
    },
    failurePath:
      "Margin below threshold → descope, re-lane, or decline. We do not buy logos with negative-margin pilots.",
  },

  // ---------------------------------------------------------
  // E3 — Architecture & Lane Confirmation
  // ---------------------------------------------------------
  {
    key: "E3",
    code: "E3",
    name: "Architecture & Lane Confirmation",
    kind: "lifecycle",
    order: 3,
    stage: "E3",
    purpose: "Lock the lane and design the declarative client layer so the core never forks.",
    trigger: "Signed proposal.",
    inputs: ["Proposal", "Discovery pack", "Any newly resolved lane-flipping answers"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Produce the architecture record: final lane, inference abstraction placement, routing/retry/budget/redaction/telemetry centralization, idempotency design for side-effecting operations, versioning plan for prompts/tool-schemas/policies/evals.",
      },
      {
        role: "AI-EXEC",
        text: "Design the declarative client layer: which variance lands where — norms-as-data, canonical schema mappings, persona/prompt packs, role definitions, theming. Anything client-specific that would touch core code is redesigned until it doesn't.",
      },
      {
        role: "HUMAN",
        text: "Security/architecture review with client IT. Named operating owner confirmed for anything Lane 3.",
      },
      {
        role: "AI-EXEC",
        text: "Verifier asserts the universal architecture rules (abstraction layer present, telemetry per-task, side-effect idempotency, versioning) and that no client logic is hard-coded in core.",
        skill: "architecture-verify",
      },
    ],
    outputs: [
      "Architecture record",
      "Declarative-layer spec",
      "Pilot design with acceptance tests written before build",
    ],
    standard: [
      "Acceptance tests are executable assertions, not prose.",
      "Every side-effecting operation has an idempotency or dedup mechanism named.",
      "Lane 3 without a named operating owner does not pass.",
    ],
    timeline: "1–2 weeks.",
    timelineDays: 14,
    gate: {
      type: "HUMAN-GATE",
      description: "Client architecture sign-off; AI-VERIFY rules check.",
    },
    failurePath:
      "Client IT blocks the integration path (the Infor LN pattern) → invoke disagree-and-commit: fallback transport (e.g., UI automation) scoped to pilot only, risks named in writing, production transport left as an open business-owned decision with a defined revisit trigger.",
  },

  // ---------------------------------------------------------
  // E4 — Pilot Build
  // ---------------------------------------------------------
  {
    key: "E4",
    code: "E4",
    name: "Pilot Build",
    kind: "lifecycle",
    order: 4,
    stage: "E4",
    purpose: "Build the smallest safe end-to-end workflow, instrumented from run one.",
    trigger: "Architecture sign-off.",
    inputs: ["Architecture record", "Acceptance tests", "Declarative-layer spec"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Build against the acceptance tests. AI systems generate ~80% of implementation; architect owns the final 20% — integration seams, judgment calls, and everything the tests don't cover.",
      },
      {
        role: "AI-EXEC",
        text: "Wire failure instrumentation (SOP X1) from the first run — not after stabilization. The canonical trace schema is part of the definition of built.",
        skill: "failure-instrumentation",
      },
      {
        role: "AI-EXEC",
        text: "Build the eval harness: golden-set cases from real client data, adversarial cases, tier-based pass gates (the OrgGPT evaluation-workbook pattern generalized).",
      },
      {
        role: "AI-EXEC",
        text: "Verifier runs the acceptance tests and the eval harness independently of the build agent. Pass = all acceptance tests green AND golden-set pass rate meets the tier gate.",
        skill: "eval-verify",
      },
    ],
    outputs: [
      "Working pilot",
      "Eval harness with baseline scores",
      "Trace store receiving live data",
    ],
    standard: [
      "Smallest safe end-to-end workflow passes acceptance tests.",
      "No demo path that differs from the instrumented path.",
      "Every prompt, tool schema, and policy is versioned from commit one.",
    ],
    timeline: "Per costed estimate; slippage > 20% triggers a nudge and a re-forecast, not silence.",
    timelineDays: 14,
    gate: {
      type: "AI-VERIFY",
      description: "Acceptance + eval gate → HUMAN-GATE: architect declares pilot-ready.",
    },
    failurePath:
      "Eval gate fails → failure traces are classified (X1), the fix targets the failure class, and the harness re-runs. Three consecutive failures on the same class escalate to architecture review, not more retries.",
  },

  // ---------------------------------------------------------
  // E5 — Controlled Pilot Run
  // ---------------------------------------------------------
  {
    key: "E5",
    code: "E5",
    name: "Controlled Pilot Run",
    kind: "lifecycle",
    order: 5,
    stage: "E5",
    purpose: "Measure real transactions against agreed thresholds; decide on evidence, not sentiment.",
    trigger: "Pilot-ready declaration.",
    inputs: [
      "Working pilot",
      "Agreed measurement thresholds (success rate, human-review rate, cost per successful task, cycle-time delta vs. baseline)",
    ],
    steps: [
      {
        role: "HUMAN",
        text: "Client-side users run real transactions. Architects observe; they do not drive.",
      },
      {
        role: "AI-EXEC",
        text: "Continuous measurement against thresholds; weekly digest auto-generated: volumes, success rate, exception rate, cost per attempted and per successful task, top failure classes from the trace store.",
      },
      {
        role: "AI-EXEC",
        text: "Nudge system pushes threshold breaches to the architect same-day.",
      },
      {
        role: "HUMAN",
        text: "Weekly review with client sponsor using the digest.",
      },
    ],
    outputs: [
      "Pilot run report: measured performance vs. thresholds, failure-class distribution, OPEX actuals vs. P50/P90 estimate",
    ],
    standard: [
      "Decisions are made on measured thresholds, not sentiment.",
      "Estimate-vs-actual deltas feed back into the costing skill's calibration data.",
    ],
    timeline: "4–8 weeks of controlled run.",
    timelineDays: 56,
    gate: {
      type: "HUMAN-GATE",
      description:
        "Go / revise / stop / migrate — a business decision made by the client with our written recommendation. All four options are always presented; go is never assumed.",
    },
    failurePath:
      "Stop is a legitimate outcome and is harvested (E8) with the same rigor as a win. A stopped pilot with clean failure data is a research asset, not an embarrassment.",
  },

  // ---------------------------------------------------------
  // E6 — Production Decision & Hardening
  // ---------------------------------------------------------
  {
    key: "E6",
    code: "E6",
    name: "Production Decision & Hardening",
    kind: "lifecycle",
    order: 6,
    stage: "E6",
    purpose: "Convert pilot compromises into dated, named production decisions and harden per lane.",
    trigger: "\"Go\" from E5.",
    inputs: ["Pilot run report", "Disagree-and-commit register", "Production readiness checklist"],
    steps: [
      {
        role: "HUMAN",
        text: "Re-open every disagree-and-commit item. Pilot-only compromises get an explicit production decision now — carried forward deliberately or replaced. Silence is not carrying forward.",
      },
      {
        role: "AI-EXEC",
        text: "Production hardening per lane: monitoring, failover, on-call runbooks, capacity plan, upgrade path.",
      },
      {
        role: "AI-EXEC",
        text: "Production readiness review as executable checklist: security, observability, incident ownership, rollback, data retention/deletion compliance.",
        skill: "readiness-verify",
      },
    ],
    outputs: [
      "Production readiness record",
      "Updated architecture record",
      "Revised OPEX forecast from pilot actuals",
    ],
    standard: [
      "Every pilot compromise has a dated production decision with a named decider.",
      "Break-even math for any lane migration uses pilot actuals, not proposal estimates.",
    ],
    timeline: "2–4 weeks.",
    timelineDays: 28,
    gate: {
      type: "AI-VERIFY",
      description: "Readiness checklist → HUMAN-GATE: joint go-live sign-off.",
    },
    failurePath:
      "Readiness fails → itemized remediation with owners and dates; no partial go-lives on side-effecting workflows.",
  },

  // ---------------------------------------------------------
  // E7 — Production Operations
  // ---------------------------------------------------------
  {
    key: "E7",
    code: "E7",
    name: "Production Operations",
    kind: "lifecycle",
    order: 7,
    stage: "E7",
    purpose: "Run in production with continuous telemetry and a non-optional monthly cadence.",
    trigger: "Go-live.",
    inputs: ["Readiness record", "SLAs", "Monthly review calendar"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Continuous telemetry: tokens, runtime, tools, retries, human review, success, cost, and value per completed task.",
      },
      {
        role: "AI-EXEC",
        text: "Monthly service review auto-drafted: quality, cost, risk, margin, failure-class trends, and any measured migration triggers (volume thresholds, latency, cost crossover) approaching.",
      },
      {
        role: "HUMAN",
        text: "Monthly review with client; quarterly margin review internally.",
      },
    ],
    outputs: ["Monthly review packs", "Margin actuals into the quarterly review (X4)"],
    standard: [
      "Migration recommendations only when break-even ≤ contract term, volume is proven, and an operating owner exists — never on token-cost comparison alone.",
    ],
    timeline: "Ongoing; monthly cadence non-optional.",
    timelineDays: 30,
    gate: {
      type: "HUMAN-GATE",
      description: "Quarterly continuation/expansion decision per account.",
    },
    failurePath:
      "Margin erosion two months running → re-price, re-lane, or restructure. Logged, not tolerated.",
  },

  // ---------------------------------------------------------
  // E8 — Harvest
  // ---------------------------------------------------------
  {
    key: "E8",
    code: "E8",
    name: "Harvest",
    kind: "lifecycle",
    order: 8,
    stage: "E8",
    purpose: "Convert every engagement into all three flywheel assets — never revenue alone.",
    trigger: "E5 gate decision (any outcome) or quarterly tick.",
    inputs: ["Trace store", "Engagement artifacts", "Estimate-vs-actual data"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Extract: new failure classes → taxonomy (X1); reusable patterns → IP capture (X2); anonymized findings → publishing pipeline (X3); costing deltas → skill calibration.",
      },
      {
        role: "HUMAN",
        text: "Architect writes the deployment story — the specific, named, verified narrative (the Jewelex 12-use-cases/140-people, K Girdharlal 100-hours/month class of claim) that feeds the book, the website, and the sales motion.",
      },
      {
        role: "AI-EXEC",
        text: "Verifier confirms all three flywheel outputs exist. An engagement closing with only revenue logged = harvest gate fails.",
        skill: "harvest-verify",
      },
    ],
    outputs: [
      "Taxonomy delta",
      "IP register entries",
      "Publishable-findings memo",
      "Verified metrics for external use",
    ],
    standard: [
      "Client-identifying data never leaves without written permission; anonymization is verified, not assumed.",
      "Metrics used externally must be client-verified in writing.",
    ],
    timeline: "Within 2 weeks of trigger.",
    timelineDays: 14,
    gate: {
      type: "AI-VERIFY",
      description: "Three-output check.",
    },
    failurePath: "Missing output → nudge escalates weekly until closed. Harvest debt is tracked like technical debt.",
  },

  // ---------------------------------------------------------
  // X1 — Failure Instrumentation (the research spine)
  // ---------------------------------------------------------
  {
    key: "X1",
    code: "X1",
    name: "Failure Instrumentation",
    kind: "cross-cutting",
    order: 0,
    purpose: "One schema across all clients and lanes — the comparability that is the research value.",
    trigger: "Every agent run, in every environment, from the first pilot run.",
    inputs: [
      "Canonical trace schema (versioned): task attempted, context, tool calls, outcome class, failure class, environment fingerprint (system-of-record type, transport, data-boundary posture), cost, human-intervention record.",
    ],
    steps: [
      {
        role: "AI-EXEC",
        text: "Emit traces per schema; classify failures against the current taxonomy; flag unclassifiable failures as candidate new classes.",
        skill: "failure-instrumentation",
      },
      {
        role: "HUMAN",
        text: "Architect adjudicates candidate classes monthly — the taxonomy grows by adjudication, not auto-append, or it degrades into noise.",
      },
      {
        role: "AI-EXEC",
        text: "Quarterly: benchmark snapshot — failure-class rates by environment fingerprint. This is the proprietary asset.",
      },
    ],
    outputs: ["Trace store data", "Adjudicated taxonomy", "Quarterly benchmark snapshot"],
    standard: [
      "One schema across all clients and all lanes.",
      "Schema changes are versioned and migrate old traces or explicitly deprecate them.",
      "The taxonomy must remain environment-comparable — that comparability is the research value.",
    ],
    timeline: "Continuous; adjudication monthly; benchmark quarterly.",
    timelineDays: 30,
    gate: {
      type: "AI-VERIFY",
      description: "Schema conformance on every deployment (checked at E4 and E6).",
    },
    failurePath: "Unclassifiable failures accumulate → instrumentation audit; taxonomy adjudication is overdue.",
  },

  // ---------------------------------------------------------
  // X2 — IP Capture
  // ---------------------------------------------------------
  {
    key: "X2",
    code: "X2",
    name: "IP Capture",
    kind: "cross-cutting",
    order: 1,
    purpose: "Anything built twice becomes a reusable asset — the numerator of the decoupling ratio.",
    trigger: "Any artifact built twice, or any pattern an architect flags as reusable.",
    inputs: ["Harvest artifacts", "Architect reuse flags"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Candidate scan at every harvest: prompts, tool contracts, declarative-layer patterns, eval structures, integration adapters (e.g., an ERP MCP contract layer as a stable transport abstraction).",
      },
      {
        role: "HUMAN",
        text: "Architect decides: package as skill / fold into OrgGPT core / fold into harness / discard.",
      },
      {
        role: "AI-EXEC",
        text: "Packaging to skill standard (schema-conformant SKILL.md, versioned, with eval cases).",
      },
    ],
    outputs: ["IP register entries with reuse count and hours saved", "Packaged skills"],
    standard: [
      "IP register tracks each asset's reuse count and the engagement-hours it saved.",
      "This is the numerator of the decoupling ratio.",
    ],
    timeline: "At every harvest.",
    timelineDays: 14,
    gate: {
      type: "AI-VERIFY",
      description: "Any pattern with reuse count ≥ 2 that isn't packaged = flagged at quarterly review.",
    },
    failurePath: "Reused-but-unpackaged pattern → flagged at quarterly review as leaked leverage.",
  },

  // ---------------------------------------------------------
  // X3 — Publishing
  // ---------------------------------------------------------
  {
    key: "X3",
    code: "X3",
    name: "Publishing",
    kind: "cross-cutting",
    order: 2,
    purpose: "Publish only what our deployment access uniquely produces; decline commodity takes.",
    trigger: "Publishable-findings memo from E8, or quarterly taxonomy snapshot.",
    inputs: ["Publishable-findings memo", "Quarterly taxonomy snapshot"],
    steps: [
      {
        role: "AI-EXEC",
        text: "Draft in the packaged voice skill (voice DNA: no em-dashes, no filler affirmations, bold-term beats with italic punchlines, named frameworks). AI drafts; the 80/20 rule applies — final voice and judgment are human.",
        skill: "voice",
      },
      {
        role: "HUMAN",
        text: "Author owns the final cut and the decision to publish.",
      },
      {
        role: "AI-EXEC",
        text: "Pre-publish check: client anonymization verified, claims traceable to trace-store evidence, voice-skill conformance.",
        skill: "publish-verify",
      },
    ],
    outputs: ["Published piece", "Annual taxonomy report"],
    standard: [
      "We publish only what our deployment access uniquely produces.",
      "Commodity takes are declined — they spend credibility without buying differentiation.",
    ],
    timeline: "Minimum one substantive piece per quarter; the taxonomy report annually.",
    timelineDays: 90,
    gate: {
      type: "HUMAN-GATE",
      description: "Author owns the decision to publish; pre-publish anonymization + voice check must pass.",
    },
    failurePath: "Cadence < 1 substantive piece per quarter → allocated in next quarter's capital split.",
  },

  // ---------------------------------------------------------
  // X4 — Quarterly Operating Review (the governance loop)
  // ---------------------------------------------------------
  {
    key: "X4",
    code: "X4",
    name: "Quarterly Operating Review",
    kind: "cross-cutting",
    order: 3,
    purpose: "Every decision cites evidence from the trace store, margin model, or IP register — or is deferred.",
    trigger: "Calendar, non-optional.",
    inputs: [
      "Auto-compiled pack: margin by account, decoupling ratio, concentration ratio, IP register deltas, taxonomy growth, publishing output, estimate-vs-actual calibration report, harvest-debt list, SOP change proposals with evidence.",
    ],
    steps: [
      {
        role: "AI-EXEC",
        text: "Compile the review pack; flag every doctrine breach (concentration > 40%, decoupling ratio flat 2 quarters, harvest debt > 30 days, margin below threshold).",
      },
      {
        role: "HUMAN",
        text: "Founders decide: capital allocation of the quarter's margin across platform / research / reserve; SOP ratifications; account continuation calls; any infrastructure-ownership trigger review (the DGX-class decision, re-run against actual utilization data).",
      },
    ],
    outputs: ["Ratified allocations", "SOP versions", "Next quarter's threshold settings"],
    standard: [
      "Every decision in this meeting cites evidence from the trace store, the margin model, or the IP register.",
      "Decisions without evidence lines are deferred, not debated.",
    ],
    timeline: "Quarterly, non-optional.",
    timelineDays: 90,
    gate: {
      type: "HUMAN-GATE",
      description: "Founders ratify allocations, SOP versions, and thresholds against evidence lines.",
    },
    failurePath: "A decision proposed without an evidence line is deferred to the next review, not debated now.",
  },
];

// ---- Lookups ----

export const SOP_BY_KEY: Record<string, Sop> = SOPS.reduce(
  (acc, sop) => {
    acc[sop.key] = sop;
    return acc;
  },
  {} as Record<string, Sop>,
);

export const LIFECYCLE_SOPS: Sop[] = SOPS.filter((s) => s.kind === "lifecycle").sort(
  (a, b) => a.order - b.order,
);

export const CROSS_CUTTING_SOPS: Sop[] = SOPS.filter((s) => s.kind === "cross-cutting").sort(
  (a, b) => a.order - b.order,
);

/** The lifecycle SOP whose stage matches the engagement's current stage. */
export function sopForStage(stage: string): Sop | undefined {
  return LIFECYCLE_SOPS.find((s) => s.stage === stage);
}
