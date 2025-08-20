// Utilities for enhanced task management.
// Currently provides sorting by priority within columns.

import { Task, Priority } from "@/FocusStudioStarter";

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };

export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/**
 * Reorder a list of tasks by moving the task at `fromIndex` to `toIndex`.
 * This utility provides a foundation for drag-and-drop interactions
 * between columns and within the same column.
 */
export function reorderTasks(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
  const updated = [...tasks];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  return updated;
}
