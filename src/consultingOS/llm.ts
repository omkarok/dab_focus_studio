// ============================================================
// Consulting OS — shared LLM client
// ------------------------------------------------------------
// A thin, provider-agnostic chat helper used by the Executor
// and Verifier agents. When no API key is configured the agents
// fall back to deterministic behaviour, so the OS remains fully
// usable offline — the AI is an accelerant, not a dependency.
// ============================================================

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const API_KEY = ((import.meta as any).env?.VITE_OPENAI_API_KEY ??
  (globalThis as any)?.process?.env?.VITE_OPENAI_API_KEY) as string | undefined;

const MODEL = ((import.meta as any).env?.VITE_OPENAI_MODEL ??
  (globalThis as any)?.process?.env?.VITE_OPENAI_MODEL ??
  "gpt-4.1-mini") as string;

export function isLlmConfigured(): boolean {
  return Boolean(API_KEY);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Single chat completion. Returns the assistant text, or null when
 * no key is set or the request fails — callers must handle null by
 * falling back to deterministic behaviour.
 */
export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: opts.temperature ?? 0.2,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[consulting-os] LLM request failed", await res.text());
      return null;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  } catch (err) {
    console.error("[consulting-os] LLM request error", err);
    return null;
  }
}

/** Best-effort JSON extraction from a model reply (handles ```json fences). */
export function parseJsonLoose<T>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(body) as T;
  } catch {
    // Try to find the first {...} or [...] block
    const objMatch = body.match(/[[{][\s\S]*[\]}]/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
