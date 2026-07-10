// Part III lifecycle as a portfolio board (E0 → E8) plus a cockpit
// for the active engagement: stage, lane, commercial figures, the
// disagree-and-commit register, IP assets, failure classes, harvest.
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/lib/projectContext";
import { useEngagements } from "../engagementContext";
import { STAGE_ORDER, STAGE_LABELS, LANES } from "../os";
import { sopForStage } from "../sops";
import { StageBadge } from "./shared";
import type {
  EngagementProfile,
  StageKey,
  Lane,
  BoundaryPosture,
  EstimateConfidence,
  IpAsset,
} from "../types";
import {
  ArrowRight,
  Building2,
  Plus,
  Check,
  ShieldAlert,
  Boxes,
  ScrollText,
  Trophy,
} from "lucide-react";

const BOUNDARY_OPTIONS: BoundaryPosture[] = ["unknown", "on-prem", "private-cloud", "public-cloud"];
const CONFIDENCE_OPTIONS: EstimateConfidence[] = ["Low", "Medium", "High"];

export default function PipelinePanel({
  onOpenBoard,
}: {
  onOpenBoard: (projectId: string) => void;
}) {
  const { projects, activeProjectId, setActiveProject } = useProjects();
  const { profiles } = useEngagements();

  const byStage: Record<StageKey, EngagementProfile[]> = STAGE_ORDER.reduce(
    (acc, s) => {
      acc[s] = [];
      return acc;
    },
    {} as Record<StageKey, EngagementProfile[]>,
  );
  const nameFor = (pid: string) => projects.find((p) => p.id === pid);
  profiles.forEach((p) => {
    if (byStage[p.stage]) byStage[p.stage].push(p);
  });

  return (
    <div className="space-y-5">
      {/* Active engagement cockpit — keyed so local state resets on switch */}
      <EngagementCockpit key={activeProjectId} onOpenBoard={onOpenBoard} />

      {/* Portfolio lifecycle board */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Portfolio — engagements across the lifecycle
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="min-w-[150px] w-[150px] shrink-0">
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <span className="font-mono text-[11px] font-semibold text-accent">{stage}</span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded-full px-1.5">
                  {byStage[stage].length}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-1.5 min-h-[80px] space-y-1.5">
                {byStage[stage].map((p) => {
                  const proj = nameFor(p.projectId);
                  if (!proj) return null;
                  const active = p.projectId === activeProjectId;
                  return (
                    <button
                      key={p.projectId}
                      onClick={() => setActiveProject(p.projectId)}
                      className={`w-full text-left rounded-lg border p-2 transition-colors ${
                        active
                          ? "border-accent/50 bg-accent/10"
                          : "border-border bg-card hover:border-accent/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="text-xs font-medium truncate">{proj.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <Building2 className="h-2.5 w-2.5" />
                        {proj.client}
                      </div>
                      {p.lane !== "Undetermined" && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-1">
                          {p.lane}
                        </Badge>
                      )}
                    </button>
                  );
                })}
                {byStage[stage].length === 0 && (
                  <div className="text-[10px] text-muted-foreground/50 text-center py-3 italic">
                    —
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Each engagement is a project. Click a card to make it active, then run its stage SOP from
          the SOP Library.
        </p>
      </div>
    </div>
  );
}

function EngagementCockpit({ onOpenBoard }: { onOpenBoard: (projectId: string) => void }) {
  const { activeProject, activeProjectId } = useProjects();
  const {
    activeProfile,
    setStage,
    updateProfile,
    addDisagreeCommit,
    resolveDisagreeCommit,
    addIpAsset,
    addFailureClass,
    setHarvest,
  } = useEngagements();

  const p = activeProfile;
  const currentSop = sopForStage(p.stage);

  const num = (v: string): number | undefined => {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? undefined : n;
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: activeProject.color }}
              />
              <h2 className="text-base font-semibold truncate">{activeProject.name}</h2>
              <StageBadge stage={p.stage} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {activeProject.client}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs shrink-0"
            onClick={() => onOpenBoard(activeProjectId)}
          >
            Open board <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {currentSop && (
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {currentSop.code} {currentSop.name}
            </span>{" "}
            — {currentSop.purpose}
          </div>
        )}

        {/* Stage stepper */}
        <div>
          <Label>Lifecycle stage</Label>
          <div className="flex flex-wrap gap-1">
            {STAGE_ORDER.map((s) => {
              const active = s === p.stage;
              return (
                <button
                  key={s}
                  onClick={() => setStage(activeProjectId, s)}
                  title={STAGE_LABELS[s]}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Entered {STAGE_LABELS[p.stage]} on {new Date(p.stageEnteredAt).toLocaleDateString()}.
          </p>
        </div>

        {/* Lane / boundary / confidence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Lane</Label>
            <Select value={p.lane} onValueChange={(v) => updateProfile(activeProjectId, { lane: v as Lane })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data-boundary posture</Label>
            <Select
              value={p.boundaryPosture}
              onValueChange={(v) => updateProfile(activeProjectId, { boundaryPosture: v as BoundaryPosture })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOUNDARY_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estimate confidence</Label>
            <Select
              value={p.estimateConfidence}
              onValueChange={(v) => updateProfile(activeProjectId, { estimateConfidence: v as EstimateConfidence })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Commercial */}
        <div>
          <Label>Commercial (feeds the governing metrics)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <NumField
              placeholder="Trailing rev"
              value={p.trailingRevenue}
              onCommit={(n) => updateProfile(activeProjectId, { trailingRevenue: n })}
            />
            <NumField
              placeholder="Gross margin %"
              value={p.grossMarginPct}
              onCommit={(n) => updateProfile(activeProjectId, { grossMarginPct: n })}
            />
            <NumField
              placeholder="Deploy-linked %"
              value={p.deploymentLinkedPct}
              onCommit={(n) => updateProfile(activeProjectId, { deploymentLinkedPct: n })}
            />
            <NumField
              placeholder="Publications"
              value={p.publications}
              onCommit={(n) => updateProfile(activeProjectId, { publications: n ?? 0 })}
            />
          </div>
        </div>

        {/* Disagree-and-commit register */}
        <RegisterEditor
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          title="Disagree-and-commit register"
          items={p.disagreeCommit.map((d) => ({
            id: d.id,
            primary: d.risk,
            resolved: !!d.productionDecision,
            secondary: d.productionDecision
              ? `Production decision: ${d.productionDecision}`
              : "Open — scoped to pilot, production decision pending",
          }))}
          addPlaceholder="Name a client-forced risk to log in writing…"
          onAdd={(v) => addDisagreeCommit(activeProjectId, v)}
          onResolve={(id, decision) => resolveDisagreeCommit(activeProjectId, id, decision)}
          resolvePlaceholder="Dated production decision + decider"
        />

        {/* IP assets */}
        <IpEditor
          assets={p.ipAssets}
          onAdd={(a) => addIpAsset(activeProjectId, a)}
        />

        {/* Failure classes */}
        <TagEditor
          icon={<ScrollText className="h-3.5 w-3.5" />}
          title="Failure taxonomy (X1 — adjudicated classes)"
          tags={p.failureClasses}
          placeholder="Add an adjudicated failure class…"
          onAdd={(v) => addFailureClass(activeProjectId, v)}
        />

        {/* Harvest checklist */}
        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Harvest (E8) — every engagement must feed all three
              flywheel assets
            </span>
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { k: "taxonomyDelta" as const, label: "Taxonomy delta (X1)" },
              { k: "ipCaptured" as const, label: "IP captured (X2)" },
              { k: "published" as const, label: "Publishable findings (X3)" },
              { k: "metricsVerified" as const, label: "Metrics client-verified" },
            ].map(({ k, label }) => {
              const on = !!p.harvest?.[k];
              return (
                <button
                  key={k}
                  onClick={() => setHarvest(activeProjectId, { [k]: !on } as any)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors text-left ${
                    on
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ${on ? "bg-emerald-500 text-white" : "border border-muted-foreground/40"}`}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
      {children}
    </label>
  );
}

function NumField({
  placeholder,
  value,
  onCommit,
}: {
  placeholder: string;
  value?: number;
  onCommit: (n: number | undefined) => void;
}) {
  const [local, setLocal] = useState(value === undefined ? "" : String(value));
  return (
    <Input
      type="number"
      className="h-9 text-xs"
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        onCommit(local.trim() === "" || Number.isNaN(n) ? undefined : n);
      }}
    />
  );
}

function RegisterEditor({
  icon,
  title,
  items,
  addPlaceholder,
  onAdd,
  onResolve,
  resolvePlaceholder,
}: {
  icon: React.ReactNode;
  title: string;
  items: { id: string; primary: string; secondary: string; resolved: boolean }[];
  addPlaceholder: string;
  onAdd: (value: string) => void;
  onResolve: (id: string, decision: string) => void;
  resolvePlaceholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [decision, setDecision] = useState("");
  return (
    <div>
      <Label>
        <span className="inline-flex items-center gap-1.5">
          {icon} {title}
        </span>
      </Label>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg border border-border bg-card p-2 text-xs">
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${it.resolved ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-foreground">{it.primary}</div>
                <div className="text-[11px] text-muted-foreground">{it.secondary}</div>
                {!it.resolved && resolvingId === it.id && (
                  <div className="flex gap-1.5 mt-1.5">
                    <Input
                      className="h-7 text-xs"
                      placeholder={resolvePlaceholder}
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        if (decision.trim()) {
                          onResolve(it.id, decision.trim());
                          setDecision("");
                          setResolvingId(null);
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
              {!it.resolved && resolvingId !== it.id && (
                <button
                  className="text-[11px] text-accent hover:underline shrink-0"
                  onClick={() => {
                    setResolvingId(it.id);
                    setDecision("");
                  }}
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            className="h-8 text-xs"
            placeholder={addPlaceholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                onAdd(draft.trim());
                setDraft("");
              }
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs shrink-0"
            onClick={() => {
              if (draft.trim()) {
                onAdd(draft.trim());
                setDraft("");
              }
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function IpEditor({
  assets,
  onAdd,
}: {
  assets: IpAsset[];
  onAdd: (a: Omit<IpAsset, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<IpAsset["kind"]>("skill");
  const [reuse, setReuse] = useState("2");
  const [hours, setHours] = useState("");
  return (
    <div>
      <Label>
        <span className="inline-flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5" /> IP register (X2 — reused assets)
        </span>
      </Label>
      <div className="space-y-1.5">
        {assets.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium text-foreground truncate flex-1">{a.name}</span>
            <Badge variant="secondary" className="text-[9px] px-1 py-0">
              {a.kind}
            </Badge>
            <span className="text-muted-foreground text-[11px] shrink-0">×{a.reuseCount} reuse</span>
            <span className="text-muted-foreground text-[11px] shrink-0">{a.hoursSaved}h saved</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          <Input
            className="h-8 text-xs flex-1 min-w-[120px]"
            placeholder="Asset name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select value={kind} onValueChange={(v) => setKind(v as IpAsset["kind"])}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skill">skill</SelectItem>
              <SelectItem value="orggpt-core">OrgGPT core</SelectItem>
              <SelectItem value="harness">harness</SelectItem>
              <SelectItem value="adapter">adapter</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="h-8 w-[70px] text-xs"
            type="number"
            placeholder="reuse"
            value={reuse}
            onChange={(e) => setReuse(e.target.value)}
          />
          <Input
            className="h-8 w-[80px] text-xs"
            type="number"
            placeholder="hrs saved"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => {
              if (!name.trim()) return;
              onAdd({
                name: name.trim(),
                kind,
                reuseCount: Number(reuse) || 0,
                hoursSaved: Number(hours) || 0,
              });
              setName("");
              setHours("");
              setReuse("2");
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TagEditor({
  icon,
  title,
  tags,
  placeholder,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  tags: string[];
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <Label>
        <span className="inline-flex items-center gap-1.5">
          {icon} {title}
        </span>
      </Label>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {tags.length === 0 && (
          <span className="text-[11px] text-muted-foreground italic">
            None yet — candidate classes are adjudicated monthly, not auto-appended.
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          className="h-8 text-xs"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs shrink-0"
          onClick={() => {
            if (draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
            }
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
