import type { Task } from "@/FocusStudioStarter";

/**
 * Returns an array of 7 dates (Mon–Sun) for the week containing the given reference date.
 */
export function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);

  // getDay(): 0=Sun, 1=Mon, ... 6=Sat
  // We want Monday as the start of the week
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

/**
 * Returns true if the given date is today.
 */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Returns true if the given date is strictly before today (not including today).
 */
export function isPast(date: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return target.getTime() < today.getTime();
}

/**
 * Returns true if two dates represent the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Formats a date as "Mon 14" — abbreviated day name + date number.
 */
export function formatDayHeader(date: Date): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${dayNames[date.getDay()]} ${date.getDate()}`;
}

/**
 * Groups tasks by their due date for the given week days.
 * Returns a Map with ISO date string keys (YYYY-MM-DD) for each week day,
 * plus an "unscheduled" key for tasks without a due date.
 * Tasks with due dates outside the given week are not included in day buckets.
 */
export function groupTasksByDate(
  tasks: Task[],
  weekDays: Date[]
): Map<string, Task[]> {
  const map = new Map<string, Task[]>();

  // Initialize all day keys
  for (const day of weekDays) {
    map.set(toDateKey(day), []);
  }
  map.set("unscheduled", []);

  for (const task of tasks) {
    if (!task.due) {
      map.get("unscheduled")!.push(task);
      continue;
    }

    const taskDate = new Date(task.due);
    const key = toDateKey(taskDate);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(task);
    }
    // Tasks outside this week's range are silently omitted from day buckets
  }

  // Sort each day's tasks by priority
  const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  for (const [, dayTasks] of map) {
    dayTasks.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
    );
  }

  return map;
}

/**
 * Returns tasks that are overdue: due date is before today and not completed.
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => {
    if (!t.due || t.completed) return false;
    return isPast(new Date(t.due));
  });
}

/**
 * Converts a Date to a YYYY-MM-DD key string (local time).
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
