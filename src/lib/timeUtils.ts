// Time tracking utility functions
// Pure functions — no React, no side effects

export type TimeEntry = {
  id: string;
  taskId: string;
  projectId: string;
  startedAt: string;   // ISO
  endedAt?: string;     // ISO, undefined if still running
  duration: number;     // minutes (computed on stop, or live)
  note?: string;        // optional note for billing
};

/**
 * Format duration in minutes as "2h 15m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format duration in minutes as "2:15"
 */
export function formatDurationShort(minutes: number): string {
  if (minutes < 0) return "0:00";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

/**
 * Filter entries that fall within the given date range (inclusive).
 * An entry is included if its startedAt is within [start, end].
 */
export function getEntriesInRange(
  entries: TimeEntry[],
  start: Date,
  end: Date,
): TimeEntry[] {
  const s = start.getTime();
  const e = end.getTime();
  return entries.filter((entry) => {
    const t = new Date(entry.startedAt).getTime();
    return t >= s && t <= e;
  });
}

/**
 * Group entries by taskId, returning a map of taskId -> total minutes.
 */
export function groupByTask(entries: TimeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const prev = map.get(entry.taskId) ?? 0;
    map.set(entry.taskId, prev + entry.duration);
  }
  return map;
}

/**
 * Group entries by projectId, returning a map of projectId -> total minutes.
 */
export function groupByProject(entries: TimeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const prev = map.get(entry.projectId) ?? 0;
    map.set(entry.projectId, prev + entry.duration);
  }
  return map;
}

/**
 * Convert entries to CSV for export/invoicing.
 * taskMap maps taskId -> task title for human-readable output.
 */
export function entriesToCSV(
  entries: TimeEntry[],
  taskMap: Map<string, string>,
): string {
  const header = "Date,Task,Project,Start,End,Duration (min),Duration,Note";
  const rows = entries.map((e) => {
    const started = new Date(e.startedAt);
    const date = started.toLocaleDateString("en-US");
    const startTime = started.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = e.endedAt
      ? new Date(e.endedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "running";
    const taskName = taskMap.get(e.taskId) ?? e.taskId;
    const note = (e.note ?? "").replace(/"/g, '""');
    return `${date},"${taskName}","${e.projectId}",${startTime},${endTime},${Math.round(e.duration)},${formatDuration(e.duration)},"${note}"`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Get the start-of-day Date for a given date.
 */
export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Get the end-of-day Date for a given date.
 */
export function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * Get the start of the current week (Monday).
 */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  // Shift so Monday = 0
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Get the start of the current month.
 */
export function startOfMonth(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
