// ============================================================
// Consulting OS — engagement context
// ------------------------------------------------------------
// Layers the declarative EngagementProfile on top of each
// Project. This is the OS state for an engagement: its lifecycle
// stage, lane, commercial figures, and its research/IP spine.
//
// Persisted to localStorage keyed per project. The task board
// (DB-backed, shared) remains the execution substrate; this
// layer tracks where each engagement sits in E0 → E8 and the
// evidence the flywheel needs. A future migration can promote
// this to a shared consulting.engagements table without changing
// the engine — the profile is already declarative.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useProjects } from "@/lib/projectContext";
import { newUuid } from "@/lib/utils";
import type {
  EngagementProfile,
  StageKey,
  SopRunRecord,
  VerificationResult,
  IpAsset,
  HarvestRecord,
} from "./types";

const KEY = (projectId: string) => `acs_engagement_${projectId}`;

function loadProfile(projectId: string): EngagementProfile | null {
  try {
    const raw = localStorage.getItem(KEY(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EngagementProfile;
    // Backfill any fields added after the profile was first written.
    return {
      failureClasses: [],
      ipAssets: [],
      publications: 0,
      sopRuns: [],
      disagreeCommit: [],
      ...parsed,
      projectId,
    };
  } catch {
    return null;
  }
}

function saveProfile(profile: EngagementProfile): void {
  try {
    localStorage.setItem(KEY(profile.projectId), JSON.stringify(profile));
  } catch {
    /* ignore quota errors */
  }
}

function makeDefault(projectId: string): EngagementProfile {
  return {
    projectId,
    stage: "E0",
    stageEnteredAt: new Date().toISOString(),
    lane: "Undetermined",
    boundaryPosture: "unknown",
    estimateConfidence: "Low",
    failureClasses: [],
    ipAssets: [],
    publications: 0,
    sopRuns: [],
    disagreeCommit: [],
  };
}

interface EngagementContextValue {
  profiles: EngagementProfile[];
  getProfile: (projectId: string) => EngagementProfile;
  activeProfile: EngagementProfile;
  updateProfile: (projectId: string, patch: Partial<EngagementProfile>) => void;
  setStage: (projectId: string, stage: StageKey) => void;
  recordSopRun: (projectId: string, run: SopRunRecord) => void;
  setRunVerification: (projectId: string, runId: string, result: VerificationResult) => void;
  addDisagreeCommit: (projectId: string, risk: string) => void;
  resolveDisagreeCommit: (projectId: string, id: string, decision: string) => void;
  addIpAsset: (projectId: string, asset: Omit<IpAsset, "id">) => void;
  addFailureClass: (projectId: string, cls: string) => void;
  setHarvest: (projectId: string, patch: Partial<HarvestRecord>) => void;
}

const EngagementContext = createContext<EngagementContextValue | undefined>(undefined);

export function EngagementProvider({ children }: { children: React.ReactNode }) {
  const { projects, activeProjectId } = useProjects();
  const [store, setStore] = useState<Record<string, EngagementProfile>>({});
  // Stable default profiles so reads don't churn stageEnteredAt on each render.
  const defaultsRef = useRef<Record<string, EngagementProfile>>({});

  const ensureDefault = useCallback((projectId: string): EngagementProfile => {
    if (!defaultsRef.current[projectId]) {
      defaultsRef.current[projectId] = makeDefault(projectId);
    }
    return defaultsRef.current[projectId];
  }, []);

  // Hydrate stored profiles when the project list changes.
  useEffect(() => {
    setStore((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const p of projects) {
        if (!next[p.id]) {
          const loaded = loadProfile(p.id);
          if (loaded) {
            next[p.id] = loaded;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [projects]);

  const getProfile = useCallback(
    (projectId: string): EngagementProfile => store[projectId] ?? ensureDefault(projectId),
    [store, ensureDefault],
  );

  const mutate = useCallback(
    (projectId: string, updater: (current: EngagementProfile) => EngagementProfile) => {
      setStore((prev) => {
        const current = prev[projectId] ?? ensureDefault(projectId);
        const next = updater(current);
        saveProfile(next);
        return { ...prev, [projectId]: next };
      });
    },
    [ensureDefault],
  );

  const updateProfile = useCallback(
    (projectId: string, patch: Partial<EngagementProfile>) => {
      mutate(projectId, (c) => ({ ...c, ...patch, projectId }));
    },
    [mutate],
  );

  const setStage = useCallback(
    (projectId: string, stage: StageKey) => {
      mutate(projectId, (c) => ({ ...c, stage, stageEnteredAt: new Date().toISOString() }));
    },
    [mutate],
  );

  const recordSopRun = useCallback(
    (projectId: string, run: SopRunRecord) => {
      mutate(projectId, (c) => ({ ...c, sopRuns: [...c.sopRuns, run] }));
    },
    [mutate],
  );

  const setRunVerification = useCallback(
    (projectId: string, runId: string, result: VerificationResult) => {
      mutate(projectId, (c) => ({
        ...c,
        sopRuns: c.sopRuns.map((r) => (r.id === runId ? { ...r, verification: result } : r)),
      }));
    },
    [mutate],
  );

  const addDisagreeCommit = useCallback(
    (projectId: string, risk: string) => {
      mutate(projectId, (c) => ({
        ...c,
        disagreeCommit: [
          ...c.disagreeCommit,
          { id: newUuid(), risk, scopedToPilot: true, createdAt: new Date().toISOString() },
        ],
      }));
    },
    [mutate],
  );

  const resolveDisagreeCommit = useCallback(
    (projectId: string, id: string, decision: string) => {
      mutate(projectId, (c) => ({
        ...c,
        disagreeCommit: c.disagreeCommit.map((d) =>
          d.id === id ? { ...d, productionDecision: decision, scopedToPilot: false } : d,
        ),
      }));
    },
    [mutate],
  );

  const addIpAsset = useCallback(
    (projectId: string, asset: Omit<IpAsset, "id">) => {
      mutate(projectId, (c) => ({
        ...c,
        ipAssets: [...c.ipAssets, { ...asset, id: newUuid() }],
      }));
    },
    [mutate],
  );

  const addFailureClass = useCallback(
    (projectId: string, cls: string) => {
      const clean = cls.trim();
      if (!clean) return;
      mutate(projectId, (c) =>
        c.failureClasses.includes(clean)
          ? c
          : { ...c, failureClasses: [...c.failureClasses, clean] },
      );
    },
    [mutate],
  );

  const setHarvest = useCallback(
    (projectId: string, patch: Partial<HarvestRecord>) => {
      mutate(projectId, (c) => {
        const base: HarvestRecord = c.harvest ?? {
          taxonomyDelta: false,
          ipCaptured: false,
          published: false,
          metricsVerified: false,
          updatedAt: new Date().toISOString(),
        };
        return { ...c, harvest: { ...base, ...patch, updatedAt: new Date().toISOString() } };
      });
    },
    [mutate],
  );

  const profiles = useMemo(
    () => projects.map((p) => store[p.id] ?? ensureDefault(p.id)),
    [projects, store, ensureDefault],
  );

  const activeProfile = useMemo(
    () => store[activeProjectId] ?? ensureDefault(activeProjectId),
    [store, activeProjectId, ensureDefault],
  );

  const value: EngagementContextValue = {
    profiles,
    getProfile,
    activeProfile,
    updateProfile,
    setStage,
    recordSopRun,
    setRunVerification,
    addDisagreeCommit,
    resolveDisagreeCommit,
    addIpAsset,
    addFailureClass,
    setHarvest,
  };

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagements(): EngagementContextValue {
  const ctx = useContext(EngagementContext);
  if (!ctx) throw new Error("useEngagements must be used within an EngagementProvider");
  return ctx;
}
