// ============================================================
// Consulting OS — SOP instantiation
// ------------------------------------------------------------
// Turns a SOP (declarative) into board tasks (executable). The
// task board is the execution substrate: every SOP step becomes
// a task tagged with its role (ai-exec / human) and SOP code,
// and a closing gate task carries the Standard as its definition
// of done. This is how the spine becomes work on the board.
// ============================================================

import type { Task, ColumnKey, Priority } from "@/FocusStudioStarter";
import type { Sop } from "./types";
import { newUuid } from "@/lib/utils";

export interface InstantiateResult {
  tasks: Task[];
  taskIds: string[];
}

const ROLE_TAG: Record<string, string> = {
  "AI-EXEC": "ai-exec",
  HUMAN: "human",
};

/**
 * Build (but do not persist) the tasks for one SOP run.
 * - Step 0 lands in "next" so it is immediately actionable.
 * - Remaining steps land in "backlog".
 * - HUMAN steps default to the given owner; AI-EXEC steps stay unassigned
 *   (they are performed by the executor agent, not a person).
 * - A final gate task carries the Standard assertions and failure path.
 */
export function instantiateSopTasks(
  sop: Sop,
  projectId: string,
  ownerId?: string,
): InstantiateResult {
  const now = new Date().toISOString();
  const tasks: Task[] = [];

  sop.steps.forEach((step, i) => {
    const tags = [sop.code, ROLE_TAG[step.role] ?? "step"];
    if (step.skill) tags.push(step.skill);
    const priority: Priority = step.role === "HUMAN" ? "P1" : "P2";
    const status: ColumnKey = i === 0 ? "next" : "backlog";
    const notes = [
      `${sop.code} · ${sop.name} — step ${i + 1} of ${sop.steps.length}`,
      `Role: ${step.role}${step.skill ? ` · skill: ${step.skill}` : ""}`,
    ].join("\n");
    tasks.push({
      id: newUuid(),
      title: step.text,
      notes,
      priority,
      status,
      tags,
      createdAt: now,
      completed: false,
      projectId,
      assigneeId: step.role === "HUMAN" ? ownerId : undefined,
    });
  });

  // Closing gate task — the exit condition, checked against the Standard.
  const gateTags = [
    sop.code,
    "gate",
    sop.gate.type === "AI-VERIFY" ? "ai-verify" : "human-gate",
  ];
  const gateNotes = [
    `${sop.code} · GATE — ${sop.gate.type}`,
    sop.gate.description,
    "",
    "Standard (definition of done):",
    ...sop.standard.map((s) => `• ${s}`),
    "",
    `Failure path: ${sop.failurePath}`,
  ].join("\n");
  tasks.push({
    id: newUuid(),
    title: `Gate — ${sop.code} ${sop.name} (${sop.gate.type})`,
    notes: gateNotes,
    priority: "P1",
    status: "backlog",
    tags: gateTags,
    createdAt: now,
    completed: false,
    projectId,
    assigneeId: ownerId,
  });

  return { tasks, taskIds: tasks.map((t) => t.id) };
}
