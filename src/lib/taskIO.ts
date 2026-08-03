// ============================================================
// Task import / export.
//
// Handles moving tasks in and out of AI Consulting Studio as:
//   - JSON  — full-fidelity backup/restore (round-trips every field)
//   - CSV   — a Notion-friendly table (Name, Status, Priority, Due,
//             Tags, Estimate, Notes, Completed) that imports straight
//             into a Notion database, which Notion can then display as
//             a Calendar view.
//
// Import auto-detects JSON vs CSV, tolerates Notion's own CSV export
// column names, and supports merge (default) or replace.
// ============================================================

import type { Task, ColumnKey, Priority } from "@/FocusStudioStarter";
import { newUuid } from "@/lib/utils";

const VALID_STATUS: ColumnKey[] = ["now", "next", "later", "backlog", "done"];
const VALID_PRIORITY: Priority[] = ["P0", "P1", "P2"];

const STATUS_LABELS: Record<ColumnKey, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  backlog: "Backlog",
  done: "Done",
};

// ---------- Export ----------

export function tasksToJSON(tasks: Task[]): string {
  // Strip volatile / workspace-specific fields so the file is portable.
  const clean = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    priority: t.priority,
    status: t.status,
    estimate: t.estimate,
    tags: t.tags ?? [],
    due: t.due,
    completed: !!t.completed,
    createdAt: t.createdAt,
    completedAt: t.completedAt ?? null,
  }));
  return JSON.stringify(
    { type: "ai-consulting-studio/tasks", version: 1, tasks: clean },
    null,
    2,
  );
}

/** Quote a CSV cell if it contains a comma, quote, or newline (RFC 4180). */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const CSV_HEADERS = [
  "Name",
  "Status",
  "Priority",
  "Due",
  "Tags",
  "Estimate",
  "Notes",
  "Completed",
] as const;

export function tasksToCSV(tasks: Task[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const t of tasks) {
    const cells = [
      t.title ?? "",
      STATUS_LABELS[t.status] ?? t.status,
      t.priority ?? "",
      t.due ? t.due.slice(0, 10) : "",
      (t.tags ?? []).join("; "),
      t.estimate != null ? String(t.estimate) : "",
      t.notes ?? "",
      t.completed ? "Yes" : "No",
    ];
    rows.push(cells.map((c) => csvCell(String(c))).join(","));
  }
  return rows.join("\r\n") + "\r\n";
}

// ---------- CSV parsing ----------

/**
 * Parse CSV text into rows of string cells. Handles quoted fields,
 * escaped quotes ("") and embedded newlines per RFC 4180. Accepts both
 * CRLF and LF line endings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushCell();
      i++;
      continue;
    }
    if (ch === "\r") {
      // swallow CR; the following LF (if any) triggers the row break
      if (text[i + 1] === "\n") {
        pushRow();
        i += 2;
      } else {
        pushRow();
        i++;
      }
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  // Flush trailing cell/row unless the input ended exactly on a row break.
  if (cell.length > 0 || row.length > 0) {
    pushRow();
  }
  // Drop a trailing empty row produced by a final newline.
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function coerceStatus(raw: string): ColumnKey {
  const v = raw.trim().toLowerCase();
  const direct = VALID_STATUS.find((s) => s === v);
  if (direct) return direct;
  // Common synonyms from Notion boards.
  if (/(doing|in progress|in-progress|active|today|current)/.test(v)) return "now";
  if (/(complete|completed|done|finished|shipped)/.test(v)) return "done";
  if (/(icebox|someday|idea|parked|on hold|blocked)/.test(v)) return "backlog";
  if (/(todo|to do|to-do|not started|not-started|planned|upcoming|next|queued)/.test(v))
    return "next";
  return "backlog";
}

function coercePriority(raw: string): Priority {
  const v = raw.trim().toUpperCase();
  const direct = VALID_PRIORITY.find((p) => p === v);
  if (direct) return direct;
  if (/(CRITICAL|URGENT|HIGHEST|P0)/.test(v)) return "P0";
  if (/(HIGH|IMPORTANT|P1)/.test(v)) return "P1";
  if (/(LOW|NORMAL|MEDIUM|MED|P2)/.test(v)) return "P2";
  return "P1";
}

function coerceBool(raw: string): boolean {
  return /^(yes|true|1|done|complete|completed|✓|x)$/i.test(raw.trim());
}

function coerceDue(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  // Prefer a leading ISO date if present.
  const iso = v.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return undefined;
}

function parseTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
}

/**
 * Map a CSV table (with header row) into tasks. Header matching is
 * tolerant: it recognizes our own export headers plus common Notion
 * column names ("Task name", "Name", "Title", "Date", "Due date", …).
 */
export function tasksFromCsv(text: string): Task[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);

  const findCol = (...candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameCol = findCol("name", "title", "taskname", "task");
  const statusCol = findCol("status", "column", "lane", "state");
  const priorityCol = findCol("priority", "prio");
  const dueCol = findCol("due", "duedate", "date", "when", "deadline");
  const tagsCol = findCol("tags", "labels", "category", "categories");
  const estimateCol = findCol("estimate", "estimatepomodoros", "pomodoros", "points");
  const notesCol = findCol("notes", "description", "details", "note");
  const completedCol = findCol("completed", "done", "iscompleted");

  const at = (row: string[], idx: number): string =>
    idx >= 0 && idx < row.length ? row[idx] ?? "" : "";

  const out: Task[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = (nameCol >= 0 ? at(row, nameCol) : row[0] ?? "").trim();
    if (!title) continue;
    const completed = completedCol >= 0 ? coerceBool(at(row, completedCol)) : false;
    const status = statusCol >= 0 ? coerceStatus(at(row, statusCol)) : "backlog";
    const estimateRaw = at(row, estimateCol).trim();
    const estimateNum = estimateRaw ? Number(estimateRaw) : NaN;
    out.push({
      id: newUuid(),
      title,
      notes: notesCol >= 0 ? at(row, notesCol).trim() || undefined : undefined,
      priority: priorityCol >= 0 ? coercePriority(at(row, priorityCol)) : "P1",
      // A completed task should live in Done even if the CSV said otherwise.
      status: completed ? "done" : status,
      estimate: !isNaN(estimateNum) && estimateNum > 0 ? estimateNum : undefined,
      tags: tagsCol >= 0 ? parseTags(at(row, tagsCol)) : [],
      due: dueCol >= 0 ? coerceDue(at(row, dueCol)) : undefined,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    });
  }
  return out;
}

// ---------- JSON parsing ----------

export function tasksFromJson(text: string): Task[] {
  const parsed = JSON.parse(text);
  const rawList: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.tasks)
      ? parsed.tasks
      : [];
  const out: Task[] = [];
  for (const r of rawList) {
    const title = String(r?.title ?? "").trim();
    if (!title) continue;
    const completed = !!r?.completed;
    const status: ColumnKey = VALID_STATUS.includes(r?.status)
      ? r.status
      : completed
        ? "done"
        : "backlog";
    const priority: Priority = VALID_PRIORITY.includes(r?.priority) ? r.priority : "P1";
    out.push({
      id: newUuid(),
      title,
      notes: r?.notes ? String(r.notes) : undefined,
      priority,
      status,
      estimate:
        typeof r?.estimate === "number" && r.estimate > 0 ? r.estimate : undefined,
      tags: Array.isArray(r?.tags) ? r.tags.map(String) : parseTags(String(r?.tags ?? "")),
      due: r?.due ? coerceDue(String(r.due)) : undefined,
      completed,
      completedAt: completed ? r?.completedAt ?? new Date().toISOString() : null,
      createdAt: r?.createdAt ?? new Date().toISOString(),
    });
  }
  return out;
}

// ---------- Auto-detecting parse ----------

export type ImportFormat = "json" | "csv";

export function detectFormat(text: string): ImportFormat {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "csv";
}

export interface ParseResult {
  tasks: Task[];
  format: ImportFormat;
}

/** Parse pasted/uploaded text into tasks, auto-detecting the format. */
export function parseTasks(text: string): ParseResult {
  const format = detectFormat(text);
  const tasks = format === "json" ? tasksFromJson(text) : tasksFromCsv(text);
  return { tasks, format };
}

// ---------- Merge ----------

export type MergeMode = "merge" | "replace";

export interface MergeResult {
  tasks: Task[];
  added: number;
  skipped: number;
}

/**
 * Combine imported tasks with the current set.
 *   - "replace": the imported tasks become the whole board.
 *   - "merge":   append imported tasks, skipping ones that duplicate an
 *                existing task by (status + normalized title).
 */
export function mergeTasks(
  existing: Task[],
  incoming: Task[],
  mode: MergeMode,
): MergeResult {
  if (mode === "replace") {
    return { tasks: incoming, added: incoming.length, skipped: 0 };
  }
  const seen = new Set(
    existing.map((t) => `${t.status}::${t.title.trim().toLowerCase()}`),
  );
  const additions: Task[] = [];
  let skipped = 0;
  for (const t of incoming) {
    const key = `${t.status}::${t.title.trim().toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    additions.push(t);
  }
  return { tasks: [...existing, ...additions], added: additions.length, skipped };
}

// ---------- Download helper ----------

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
