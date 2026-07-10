// ============================================================
// Consulting OS — the three-role AI architecture
// ------------------------------------------------------------
// Per Part II §5 every SOP is run by three roles:
//   1. Executor — runs the steps, loaded with the named skill,
//      and produces the artifacts.
//   2. Verifier — a SEPARATE context that checks outputs against
//      the Standard and returns pass / fail-with-findings. Its
//      findings are themselves traces in the failure schema.
//   3. Nudge system — see nudges.ts.
// When no LLM is configured, both agents degrade to deterministic
// behaviour so the OS stays usable, honouring doctrine #1
// (reality contact) rather than faking AI output.
// ============================================================

import type { Task } from "@/FocusStudioStarter";
import type { Sop, SopStep, VerificationResult } from "./types";
import { chat, isLlmConfigured, parseJsonLoose } from "./llm";

export { isLlmConfigured };

const VOICE =
  "Write in the operating voice: no em-dashes, no filler affirmations, bold-term beats with named frameworks, evidence over vibes.";

// ---- Executor ----

export interface ExecutorResult {
  /** The drafted artifact (AI or deterministic skeleton). */
  draft: string;
  /** Whether an LLM produced the draft. */
  aiGenerated: boolean;
}

/**
 * Executor agent: draft the artifact an [AI-EXEC] step should produce.
 * Falls back to a structured skeleton the architect can complete when
 * no LLM is configured.
 */
export async function executeStep(
  sop: Sop,
  step: SopStep,
  engagementLabel: string,
): Promise<ExecutorResult> {
  if (isLlmConfigured()) {
    const out = await chat([
      {
        role: "system",
        content: `You are the Executor agent inside the bots.ai Consulting OS, running SOP ${sop.code} (${sop.name})${
          step.skill ? ` with the "${step.skill}" skill` : ""
        }. You perform the mechanical 80%; a human architect owns the final judgment. ${VOICE}`,
      },
      {
        role: "user",
        content: [
          `Engagement: ${engagementLabel}`,
          `SOP purpose: ${sop.purpose}`,
          `Required inputs: ${sop.inputs.join("; ")}`,
          `Expected outputs: ${sop.outputs.join("; ")}`,
          `Standard: ${sop.standard.join(" ")}`,
          "",
          `Step to execute: ${step.text}`,
          "",
          "Draft the artifact this step should produce. Be concrete and concise. Mark any assumption you cannot source as [UNSOURCED — confirm with client] rather than inventing it.",
        ].join("\n"),
      },
    ]);
    if (out) return { draft: out, aiGenerated: true };
  }
  return { draft: skeletonFor(sop, step, engagementLabel), aiGenerated: false };
}

function skeletonFor(sop: Sop, step: SopStep, engagementLabel: string): string {
  return [
    `# ${sop.code} · ${sop.name}`,
    `Engagement: ${engagementLabel}`,
    `Step: ${step.text}`,
    step.skill ? `Skill: ${step.skill}` : "",
    "",
    "Required inputs:",
    ...sop.inputs.map((i) => `- [ ] ${i}`),
    "",
    "Expected outputs:",
    ...sop.outputs.map((o) => `- [ ] ${o}`),
    "",
    "Standard (definition of done):",
    ...sop.standard.map((s) => `- [ ] ${s}`),
    "",
    "(No LLM key configured — this is a skeleton for the architect to complete. Set VITE_OPENAI_API_KEY to have the Executor draft it.)",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---- Verifier ----

/**
 * Verifier agent: a separate pass that checks a SOP run against its
 * Standard and gate. Deterministic core (every seeded task complete),
 * optionally enriched by an independent LLM assessment of the Standard.
 * Never the same call that produced the work.
 */
export async function verifyRun(
  sop: Sop,
  runTasks: Task[],
): Promise<VerificationResult> {
  const checkedAt = new Date().toISOString();

  // A run with no tasks on the board cannot be verified — the work is not
  // there to check. (Happens if the seeded tasks were deleted.)
  if (runTasks.length === 0) {
    return {
      status: "fail",
      findings: ["No tasks for this run are on the board — re-seed the SOP before the gate can pass."],
      checkedAt,
      verifier: "deterministic",
    };
  }

  // Deterministic core: the gate cannot pass while any seeded task is open.
  const incomplete = runTasks.filter((t) => !t.completed);
  const deterministicFindings = incomplete.map(
    (t) => `Incomplete step blocks the gate: "${t.title}"`,
  );

  if (incomplete.length > 0) {
    return {
      status: "fail",
      findings: deterministicFindings,
      checkedAt,
      verifier: "deterministic",
    };
  }

  // All steps complete. If an LLM is available, run an independent check of
  // the Standard assertions against the work as recorded.
  if (isLlmConfigured()) {
    const evidence = runTasks
      .map((t) => `- ${t.title}${t.notes ? `\n  notes: ${t.notes.replace(/\n/g, " ")}` : ""}`)
      .join("\n");
    const out = await chat(
      [
        {
          role: "system",
          content: `You are the Verifier agent inside the bots.ai Consulting OS. You did NOT do this work. Independently check SOP ${sop.code} (${sop.name}) against its Standard. Be adversarial: default to fail if evidence is thin. Return ONLY JSON: {"status":"pass"|"fail","findings":["..."]}. Findings are traces in the failure schema — specific, not vague.`,
        },
        {
          role: "user",
          content: [
            "Standard (checkable assertions):",
            ...sop.standard.map((s, i) => `${i + 1}. ${s}`),
            "",
            "Gate:",
            `${sop.gate.type} — ${sop.gate.description}`,
            "",
            "Work recorded (completed tasks for this run):",
            evidence,
          ].join("\n"),
        },
      ],
      { temperature: 0 },
    );
    const parsed = out
      ? parseJsonLoose<{ status: "pass" | "fail"; findings?: string[] }>(out)
      : null;
    if (parsed && (parsed.status === "pass" || parsed.status === "fail")) {
      return {
        status: parsed.status,
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        checkedAt,
        verifier: "ai",
      };
    }
  }

  // No LLM (or unparseable) — deterministic pass on full completion.
  return {
    status: "pass",
    findings: [],
    checkedAt,
    verifier: "deterministic",
  };
}
