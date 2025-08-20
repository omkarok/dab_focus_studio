// Placeholder utilities for analytics and reporting.
// TODO: track time spent per task and generate summaries.

import { Task } from "@/FocusStudioStarter";

export interface TaskStats {
  total: number;
  completed: number;
}

export function computeStats(tasks: Task[]): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  return { total, completed };
}
