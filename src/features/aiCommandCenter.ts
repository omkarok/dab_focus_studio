// Basic AI command center integration using OpenAI's API.
// Set `VITE_OPENAI_API_KEY` to enable these helpers.

import type { Task } from "@/FocusStudioStarter";

type TaskLike = Pick<Task, "title" | "notes">;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// Pull the API key from typical env locations. When building with Vite,
// variables prefixed with `VITE_` are exposed on `import.meta.env`. In other
// environments (e.g. tests or server-side rendering) the key may only be
// available via `process.env`. Support both to make it easier to configure via
// repository or deployment secrets.
const API_KEY =
  ((import.meta as any).env?.VITE_OPENAI_API_KEY ??
    (globalThis as any)?.process?.env?.VITE_OPENAI_API_KEY) as
    | string
    | undefined;

const MODEL =
  ((import.meta as any).env?.VITE_OPENAI_MODEL ??
    (globalThis as any)?.process?.env?.VITE_OPENAI_MODEL ??
    "gpt-4.1-mini") as string;

export async function generateSubtasks(task: TaskLike): Promise<string[]> {
  if (!API_KEY) {
    console.warn("VITE_OPENAI_API_KEY not set; returning no subtasks.");
    return [];
  }

  const prompt = `Break down the following task into actionable subtasks. Reply with each subtask on its own line.\n\nTitle: ${task.title}\nNotes: ${task.notes ?? ""}`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.error("AI request failed", await res.text());
      return [];
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return text
      .split(/\n+/)
      .map((l: string) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  } catch (err) {
    console.error("AI request error", err);
    return [];
  }
}

export async function summarizeTask(task: TaskLike): Promise<string> {
  if (!API_KEY) {
    console.warn("VITE_OPENAI_API_KEY not set; returning title.");
    return task.title;
  }

  const prompt = `Provide a short summary for the following task.\n\nTitle: ${task.title}\nNotes: ${task.notes ?? ""}`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 50,
      }),
    });

    if (!res.ok) {
      console.error("AI request failed", await res.text());
      return task.title;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || task.title;
  } catch (err) {
    console.error("AI request error", err);
    return task.title;
  }
}

/**
 * Allow callers to review and edit AI-proposed outcomes.
 * The provided editor callback receives each suggestion and its index
 * and should return the revised text. This is a groundwork helper for
 * a future UI where users can tweak AI results before saving.
 */
export function reviewAiOutcomes(
  suggestions: string[],
  editor: (suggestion: string, index: number) => string,
): string[] {
  return suggestions.map((s, i) => editor(s, i));
}
