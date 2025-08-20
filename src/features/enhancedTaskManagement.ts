// Utilities for enhanced task management.
// Currently provides sorting by priority within columns.

import { Task, Priority } from "@/FocusStudioStarter";

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
