// Part III — the SOP Library: browse each SOP's canonical schema,
// run it onto the active engagement's board, and run the Verifier.
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  Play,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { LIFECYCLE_SOPS, CROSS_CUTTING_SOPS } from "../sops";
import { instantiateSopTasks } from "../instantiate";
import { executeStep, verifyRun, isLlmConfigured } from "../agents";
import { useProjects } from "@/lib/projectContext";
import { useTasks } from "@/lib/taskContext";
import { useAuth } from "@/lib/authContext";
import { useEngagements } from "../engagementContext";
import { newUuid } from "@/lib/utils";
import type { Sop, SopStep } from "../types";
import { RoleChip, GateChip, SectionTitle } from "./shared";

export default function SopLibraryPanel({
  onOpenBoard,
}: {
  onOpenBoard: (projectId: string) => void;
}) {
  const { activeProjectId, activeProject } = useProjects();
  const { activeProfile, recordSopRun, setStage, setRunVerification } = useEngagements();
  const { tasks, setTasks } = useTasks();
  const { user } = useAuth();

  const [expanded, setExpanded] = useState<string | null>(LIFECYCLE_SOPS[0]?.key ?? null);
  const [draft, setDraft] = useState<{ sop: Sop; step: SopStep; text: string; ai: boolean } | null>(
    null,
  );
  const [drafting, setDrafting] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const engagementLabel = `${activeProject.name} · ${activeProject.client}`;

  const runSop = (sop: Sop) => {
    const { tasks: seeded, taskIds } = instantiateSopTasks(sop, activeProjectId, user?.id);
    setTasks((prev) => [...seeded, ...prev]);
    recordSopRun(activeProjectId, {
      id: newUuid(),
      sopKey: sop.key,
      startedAt: new Date().toISOString(),
      taskIds,
    });
    if (sop.stage) setStage(activeProjectId, sop.stage);
    setFlash(`Seeded ${seeded.length} tasks for ${sop.code} onto ${activeProject.name}.`);
    window.setTimeout(() => setFlash(null), 6000);
  };

  const draftStep = async (sop: Sop, step: SopStep) => {
    setDraft({ sop, step, text: "", ai: false });
    setDrafting(true);
    const res = await executeStep(sop, step, engagementLabel);
    setDraft({ sop, step, text: res.draft, ai: res.aiGenerated });
    setDrafting(false);
  };

  const runVerifier = async (sop: Sop) => {
    const runs = activeProfile.sopRuns.filter((r) => r.sopKey === sop.key);
    const latest = runs[runs.length - 1];
    if (!latest) return;
    setVerifying(sop.key);
    const runTasks = tasks.filter((t) => latest.taskIds.includes(t.id));
    const result = await verifyRun(sop, runTasks);
    setRunVerification(activeProjectId, latest.id, result);
    setVerifying(null);
  };

  return (
    <div className="space-y-4">
      {/* Context banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
        <div className="text-muted-foreground">
          Running SOPs onto{" "}
          <button
            className="font-medium text-foreground hover:text-accent underline-offset-2 hover:underline"
            onClick={() => onOpenBoard(activeProjectId)}
          >
            {activeProject.name}
          </button>{" "}
          — steps become board tasks; the gate carries the Standard.
        </div>
        <Badge variant={isLlmConfigured() ? "default" : "secondary"} className="text-[10px]">
          Executor / Verifier: {isLlmConfigured() ? "AI-backed" : "deterministic"}
        </Badge>
      </div>

      {flash && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {flash}
          <button className="ml-auto underline" onClick={() => onOpenBoard(activeProjectId)}>
            Open board <ArrowRight className="inline h-3 w-3" />
          </button>
        </div>
      )}

      <div>
        <SectionTitle>Engagement Lifecycle — E0 → E8</SectionTitle>
        <div className="space-y-2">
          {LIFECYCLE_SOPS.map((sop) => (
            <SopCard
              key={sop.key}
              sop={sop}
              expanded={expanded === sop.key}
              onToggle={() => setExpanded(expanded === sop.key ? null : sop.key)}
              onRun={() => runSop(sop)}
              onDraft={draftStep}
              onVerify={() => runVerifier(sop)}
              verifying={verifying === sop.key}
              runCount={activeProfile.sopRuns.filter((r) => r.sopKey === sop.key).length}
              verification={lastVerification(activeProfile, sop.key)}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Cross-cutting — X1 Instrument · X2 IP · X3 Publish · X4 Review</SectionTitle>
        <div className="space-y-2">
          {CROSS_CUTTING_SOPS.map((sop) => (
            <SopCard
              key={sop.key}
              sop={sop}
              expanded={expanded === sop.key}
              onToggle={() => setExpanded(expanded === sop.key ? null : sop.key)}
              onRun={() => runSop(sop)}
              onDraft={draftStep}
              onVerify={() => runVerifier(sop)}
              verifying={verifying === sop.key}
              runCount={activeProfile.sopRuns.filter((r) => r.sopKey === sop.key).length}
              verification={lastVerification(activeProfile, sop.key)}
            />
          ))}
        </div>
      </div>

      {/* Executor draft dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          {draft && (
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Executor draft — {draft.sop.code} {draft.sop.name}
                </DialogTitle>
              </DialogHeader>
              <div className="text-xs text-muted-foreground">{draft.step.text}</div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-[50vh] overflow-y-auto">
                {drafting ? (
                  <div className="text-sm text-muted-foreground">Executor drafting…</div>
                ) : (
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">
                    {draft.text}
                  </pre>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={draft.ai ? "default" : "secondary"} className="text-[10px]">
                  {draft.ai ? "AI-generated draft" : "Deterministic skeleton"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  The architect owns the final 20%.
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function lastVerification(profile: ReturnType<typeof useEngagements>["activeProfile"], key: string) {
  const runs = profile.sopRuns.filter((r) => r.sopKey === key);
  const latest = runs[runs.length - 1];
  return latest?.verification ?? null;
}

function SopCard({
  sop,
  expanded,
  onToggle,
  onRun,
  onDraft,
  onVerify,
  verifying,
  runCount,
  verification,
}: {
  sop: Sop;
  expanded: boolean;
  onToggle: () => void;
  onRun: () => void;
  onDraft: (sop: Sop, step: SopStep) => void;
  onVerify: () => void;
  verifying: boolean;
  runCount: number;
  verification: import("../types").VerificationResult | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className="font-mono text-xs font-semibold text-accent shrink-0 w-7">
            {sop.code}
          </span>
          <span className="text-sm font-semibold truncate">{sop.name}</span>
          {runCount > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
              {runCount} run{runCount === 1 ? "" : "s"}
            </Badge>
          )}
          {verification && <VerificationPill v={verification} />}
        </button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs shrink-0" onClick={onRun}>
          <Play className="h-3 w-3 mr-1" />
          Run
        </Button>
        <button onClick={onToggle} className="shrink-0 p-1">
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-3 py-3 space-y-3 text-xs">
          <p className="text-muted-foreground italic">{sop.purpose}</p>

          <Field label="Trigger">{sop.trigger}</Field>

          <div>
            <SectionTitle>Inputs</SectionTitle>
            <ul className="space-y-0.5">
              {sop.inputs.map((i, idx) => (
                <li key={idx} className="text-muted-foreground">
                  · {i}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionTitle>Steps</SectionTitle>
            <ol className="space-y-1.5">
              {sop.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground/60 font-mono shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RoleChip role={step.role} />
                      {step.skill && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {step.skill}
                        </Badge>
                      )}
                      {step.role === "AI-EXEC" && (
                        <button
                          className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5"
                          onClick={() => onDraft(sop, step)}
                        >
                          <Sparkles className="h-2.5 w-2.5" /> Draft
                        </button>
                      )}
                    </div>
                    <p className="text-foreground/90 mt-0.5 leading-relaxed">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <SectionTitle>Outputs</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {sop.outputs.map((o, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {o}
                </span>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>Standard — definition of done</SectionTitle>
            <ul className="space-y-0.5">
              {sop.standard.map((s, idx) => (
                <li key={idx} className="text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
            <span className="text-muted-foreground">
              <span className="uppercase text-[10px] tracking-wider mr-1">Timeline</span>
              {sop.timeline}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="uppercase text-[10px] tracking-wider text-muted-foreground">Gate</span>
              <GateChip type={sop.gate.type} />
            </span>
          </div>
          <Field label="Gate">{sop.gate.description}</Field>

          <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 px-2.5 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <span className="uppercase text-[10px] tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                Failure path
              </span>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{sop.failurePath}</p>
            </div>
          </div>

          {/* Verifier action */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={onVerify}
              disabled={runCount === 0 || verifying}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              {verifying ? "Verifying…" : "Run Verifier"}
            </Button>
            {runCount === 0 && (
              <span className="text-[11px] text-muted-foreground">Run the SOP first.</span>
            )}
            {verification && <VerificationDetail v={verification} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="uppercase text-[10px] tracking-wider text-muted-foreground mr-1.5">
        {label}
      </span>
      <span className="text-foreground/90">{children}</span>
    </div>
  );
}

function VerificationPill({ v }: { v: import("../types").VerificationResult }) {
  const pass = v.status === "pass";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 ${
        pass
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      {pass ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
      {pass ? "verified" : "gate fail"}
    </span>
  );
}

function VerificationDetail({ v }: { v: import("../types").VerificationResult }) {
  return (
    <div className="text-[11px] text-muted-foreground flex-1 min-w-0">
      <span className="mr-1">
        {v.status === "pass" ? "Passed" : "Failed"} ({v.verifier})
      </span>
      {v.findings.length > 0 && (
        <span className="text-red-500">· {v.findings.length} finding{v.findings.length === 1 ? "" : "s"}</span>
      )}
      {v.findings.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {v.findings.slice(0, 4).map((f, i) => (
            <li key={i} className="text-red-500/90">
              — {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
