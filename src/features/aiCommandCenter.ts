// Placeholder for AI command center integration.
// TODO: connect to an AI service to assist with task generation.

export async function generateSubtasks(task: any): Promise<string[]> {
  // In the future this will call an AI API with task context.
  return [];
}

export async function summarizeTask(task: any): Promise<string> {
  // Returns a short summary via AI; currently returns title if present.
  return task?.title ?? "";
}
