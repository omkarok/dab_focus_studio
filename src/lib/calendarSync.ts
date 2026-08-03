// ============================================================
// Notion Calendar sync via iCalendar (.ics).
//
// Notion Calendar cannot be written to directly from the browser
// (Notion's REST API sends no CORS headers, so an in-browser push
// is blocked). What Notion Calendar *does* support natively is
// subscribing to an iCalendar (.ics) feed — the same mechanism it
// uses for Google Calendar and any other calendar provider.
//
// This module turns AI Consulting Studio tasks (those carrying a due
// date) into a standards-compliant VCALENDAR document. The user
// downloads the .ics and imports/subscribes to it in Notion Calendar,
// so every scheduled task shows up on their calendar.
// ============================================================

import type { Task } from "@/FocusStudioStarter";
import { parseDueDate } from "@/lib/calendarUtils";

export interface IcsOptions {
  /** Calendar name shown in Notion / the calendar client. */
  calendarName?: string;
  /** Include tasks already marked complete. Default false. */
  includeCompleted?: boolean;
  /**
   * Fixed timestamp (ms) used for DTSTAMP / UID generation. Injectable so
   * output is deterministic in tests. Defaults to Date.now() at call time.
   */
  now?: number;
}

// iCal PRIORITY is 1 (highest) … 9 (lowest); 0 = undefined.
const PRIORITY_TO_ICAL: Record<string, number> = {
  P0: 1,
  P1: 5,
  P2: 9,
};

const STATUS_LABELS: Record<string, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  backlog: "Backlog",
  done: "Done",
};

/**
 * Escape a value for an iCalendar text field per RFC 5545 §3.3.11:
 * backslash, semicolon, comma and newlines must be escaped.
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Format a Date as an all-day DATE value: YYYYMMDD (local calendar day). */
function toIcsDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format a millisecond timestamp as a UTC DATE-TIME value: YYYYMMDDTHHMMSSZ. */
function toIcsDateTimeUtc(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const h = String(dt.getUTCHours()).padStart(2, "0");
  const mi = String(dt.getUTCMinutes()).padStart(2, "0");
  const s = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

/** Add one calendar day — iCal all-day DTEND is exclusive. */
function nextDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Fold a content line to 75 octets per RFC 5545 §3.1. Continuation lines
 * start with a single space. Kept simple (char-based) which is correct for
 * the ASCII-dominant content we emit; multi-byte content still stays valid
 * because we never split an escaped sequence's backslash from its char.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let idx = 0;
  // First line: 75 chars. Subsequent: 74 chars (+1 leading space = 75).
  parts.push(line.slice(0, 75));
  idx = 75;
  while (idx < line.length) {
    parts.push(" " + line.slice(idx, idx + 74));
    idx += 74;
  }
  return parts.join("\r\n");
}

/** Tasks eligible for the calendar: have a due date, honoring the completed filter. */
export function schedulableTasks(tasks: Task[], includeCompleted: boolean): Task[] {
  return tasks.filter((t) => !!t.due && (includeCompleted || !t.completed));
}

/**
 * Build a stable per-task UID. Prefer the task id (a UUID in DB mode); the
 * domain suffix keeps it globally unique per RFC 5545 recommendation.
 */
function taskUid(task: Task): string {
  const base = task.id || task.title.replace(/\s+/g, "-").toLowerCase();
  return `${base}@ai-consulting-studio`;
}

/**
 * Convert tasks with due dates into an iCalendar document (all-day events).
 * Returns the full VCALENDAR text with CRLF line endings.
 */
export function tasksToICS(tasks: Task[], options: IcsOptions = {}): string {
  const {
    calendarName = "AI Consulting Studio",
    includeCompleted = false,
    now = Date.now(),
  } = options;

  const dtstamp = toIcsDateTimeUtc(now);
  const scheduled = schedulableTasks(tasks, includeCompleted);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Consulting Studio//Task Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `NAME:${escapeIcsText(calendarName)}`,
  ];

  for (const task of scheduled) {
    const start = parseDueDate(task.due!);
    const end = nextDay(start);

    const descParts: string[] = [];
    if (task.notes) descParts.push(task.notes);
    descParts.push(`Status: ${STATUS_LABELS[task.status] ?? task.status}`);
    descParts.push(`Priority: ${task.priority}`);
    if (task.estimate) descParts.push(`Estimate: ${task.estimate} pomodoro(s)`);
    if ((task.tags ?? []).length) descParts.push(`Tags: ${(task.tags ?? []).join(", ")}`);
    const description = descParts.join("\n");

    const categories = [
      STATUS_LABELS[task.status] ?? task.status,
      ...(task.tags ?? []),
    ].filter(Boolean);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(taskUid(task))}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(end)}`);
    lines.push(`SUMMARY:${escapeIcsText(task.title)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    if (categories.length) lines.push(`CATEGORIES:${escapeIcsText(categories.join(","))}`);
    const prio = PRIORITY_TO_ICAL[task.priority];
    if (prio) lines.push(`PRIORITY:${prio}`);
    lines.push(`STATUS:${task.completed ? "COMPLETED" : "CONFIRMED"}`);
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
