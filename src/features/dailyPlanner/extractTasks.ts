import type { ColumnKey, Priority } from "@/FocusStudioStarter";

export type ExtractedTask = {
  title: string;
  priority: Priority;
  column: ColumnKey;
  notes?: string;
};

const API_KEY = ((import.meta as any).env?.VITE_OPENAI_API_KEY ?? "") as string;
const MODEL = ((import.meta as any).env?.VITE_OPENAI_MODEL ?? "gpt-4.1-mini") as string;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const VALID_PRIORITIES: Priority[] = ["P0", "P1", "P2"];
const VALID_COLUMNS: ColumnKey[] = ["now", "next", "later", "backlog", "done"];

export const hasApiKey = () => Boolean(API_KEY);

function normalize(raw: any): ExtractedTask | null {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return null;
  const priority = VALID_PRIORITIES.includes(raw.priority) ? raw.priority : "P1";
  const column = VALID_COLUMNS.includes(raw.column) ? raw.column : "now";
  return {
    title: raw.title.trim(),
    priority,
    column,
    notes: typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : undefined,
  };
}

function fallbackSplit(text: string): ExtractedTask[] {
  return text
    .split(/[\n;]|(?:,\s+)(?=[A-Z])/)
    .map((l) => l.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter((l) => l.length > 2)
    .map((title) => ({ title, priority: "P1" as Priority, column: "now" as ColumnKey }));
}

export async function extractTasksFromText(text: string): Promise<ExtractedTask[]> {
  if (!text.trim()) return [];
  if (!API_KEY) return fallbackSplit(text);

  const systemPrompt =
    "You extract actionable tasks from a user's spoken or typed daily plan. " +
    "Return STRICT JSON: { \"tasks\": [ { \"title\": string (short imperative, <80 chars), \"priority\": \"P0\"|\"P1\"|\"P2\", \"column\": \"now\"|\"next\"|\"later\"|\"backlog\", \"notes\"?: string } ] }. " +
    "Rules: P0 = urgent/blocking, P1 = normal priority (default), P2 = low/nice-to-have. " +
    "Column: now = doing today, next = this week, later = this month+, backlog = someday. " +
    "Default to column=now when the user is planning their day. " +
    "Split compound sentences into separate tasks. Drop filler like 'I need to' / 'I want to'. " +
    "Return only the JSON object, no prose.";

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("extractTasks: API returned", res.status, await res.text());
      return fallbackSplit(text);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const list = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    const normalized = list.map(normalize).filter(Boolean) as ExtractedTask[];
    return normalized.length ? normalized : fallbackSplit(text);
  } catch (err) {
    console.warn("extractTasks: fell back to split", err);
    return fallbackSplit(text);
  }
}
