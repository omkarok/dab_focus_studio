import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { TimeEntry } from "@/lib/timeUtils";
import {
  getEntriesInRange,
  groupByTask,
  groupByProject,
  startOfDay,
  endOfDay,
} from "@/lib/timeUtils";

export type { TimeEntry } from "@/lib/timeUtils";

const LS_KEY = "acs_time_entries_v1";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadEntries(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as TimeEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: TimeEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full — silently fail
  }
}

// --- Context value ---
interface TimeContextValue {
  entries: TimeEntry[];
  activeEntry: TimeEntry | null;
  elapsedMinutes: number; // live elapsed for active entry
  startTracking: (taskId: string, projectId: string, note?: string) => void;
  stopTracking: () => void;
  getTaskTime: (taskId: string) => number;
  getProjectTime: (projectId: string) => number;
  getTodayTotal: () => number;
  getTodayEntries: () => TimeEntry[];
}

const TimeContext = createContext<TimeContextValue | undefined>(undefined);

// --- Provider ---
export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<TimeEntry[]>(loadEntries);
  const [tick, setTick] = useState(0); // forces re-render for live timer
  const tickRef = useRef<number | null>(null);

  // Persist to localStorage on change
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  // Find the active (un-ended) entry
  const activeEntry = useMemo(
    () => entries.find((e) => !e.endedAt) ?? null,
    [entries],
  );

  // Live elapsed minutes for active entry
  const elapsedMinutes = useMemo(() => {
    // tick dependency keeps this value updating
    void tick;
    if (!activeEntry) return 0;
    const started = new Date(activeEntry.startedAt).getTime();
    return (Date.now() - started) / 60000;
  }, [activeEntry, tick]);

  // Tick every second while a timer is active
  useEffect(() => {
    if (activeEntry) {
      tickRef.current = window.setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
    } else {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [activeEntry]);

  const stopTracking = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.endedAt) return e;
        const now = new Date().toISOString();
        const dur = (Date.now() - new Date(e.startedAt).getTime()) / 60000;
        return { ...e, endedAt: now, duration: dur };
      }),
    );
  }, []);

  const startTracking = useCallback(
    (taskId: string, projectId: string, note?: string) => {
      // Stop any currently running entry first
      setEntries((prev) => {
        const stopped = prev.map((e) => {
          if (e.endedAt) return e;
          const now = new Date().toISOString();
          const dur = (Date.now() - new Date(e.startedAt).getTime()) / 60000;
          return { ...e, endedAt: now, duration: dur };
        });

        const newEntry: TimeEntry = {
          id: uid(),
          taskId,
          projectId,
          startedAt: new Date().toISOString(),
          endedAt: undefined,
          duration: 0,
          note,
        };

        return [...stopped, newEntry];
      });
    },
    [],
  );

  const getTaskTime = useCallback(
    (taskId: string): number => {
      const taskEntries = entries.filter((e) => e.taskId === taskId);
      const taskMap = groupByTask(taskEntries);
      let total = taskMap.get(taskId) ?? 0;
      // Add live time if active entry is for this task
      if (activeEntry && activeEntry.taskId === taskId) {
        total += elapsedMinutes;
      }
      return total;
    },
    [entries, activeEntry, elapsedMinutes],
  );

  const getProjectTime = useCallback(
    (projectId: string): number => {
      const projEntries = entries.filter((e) => e.projectId === projectId);
      const projMap = groupByProject(projEntries);
      let total = projMap.get(projectId) ?? 0;
      // Add live time if active entry is for this project
      if (activeEntry && activeEntry.projectId === projectId) {
        total += elapsedMinutes;
      }
      return total;
    },
    [entries, activeEntry, elapsedMinutes],
  );

  const getTodayEntries = useCallback((): TimeEntry[] => {
    const now = new Date();
    return getEntriesInRange(entries, startOfDay(now), endOfDay(now));
  }, [entries]);

  const getTodayTotal = useCallback((): number => {
    const todayEntries = getTodayEntries();
    let total = todayEntries.reduce((sum, e) => sum + e.duration, 0);
    // Add live elapsed for the active entry if it started today
    if (activeEntry) {
      const activeStart = new Date(activeEntry.startedAt);
      const now = new Date();
      if (
        activeStart >= startOfDay(now) &&
        activeStart <= endOfDay(now)
      ) {
        total += elapsedMinutes;
      }
    }
    return total;
  }, [getTodayEntries, activeEntry, elapsedMinutes]);

  const value = useMemo<TimeContextValue>(
    () => ({
      entries,
      activeEntry,
      elapsedMinutes,
      startTracking,
      stopTracking,
      getTaskTime,
      getProjectTime,
      getTodayTotal,
      getTodayEntries,
    }),
    [
      entries,
      activeEntry,
      elapsedMinutes,
      startTracking,
      stopTracking,
      getTaskTime,
      getProjectTime,
      getTodayTotal,
      getTodayEntries,
    ],
  );

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

// --- Hook ---
export function useTimeTracking(): TimeContextValue {
  const ctx = useContext(TimeContext);
  if (!ctx)
    throw new Error("useTimeTracking must be used within a TimeProvider");
  return ctx;
}
