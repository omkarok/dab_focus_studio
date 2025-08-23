import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/taskContext";
import { useTemplates } from "@/lib/templateContext";
import type { ColumnKey, Priority, Task } from "@/FocusStudioStarter";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function PlanningChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I can help plan your tasks and priorities. Ask me anything.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { tasks, setTasks, updateTask } = useTasks();
  const { templates } = useTemplates();
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, open]);

  function applyCommands(text: string) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("/move")) {
        const [, id, column] = line.split(/\s+/);
        if (id && column) updateTask(id, { status: column as ColumnKey });
      } else if (line.startsWith("/priority")) {
        const [, id, pr] = line.split(/\s+/);
        if (id && pr) updateTask(id, { priority: pr as Priority });
      } else if (line.startsWith("/add")) {
        const parts = line.slice(5).split("|");
        const title = parts[0]?.trim();
        if (title) {
          const priority = (parts[1]?.trim() as Priority) || "P1";
          const status = (parts[2]?.trim() as ColumnKey) || "backlog";
          const newTask: Task = {
            id: uid(),
            title,
            priority,
            status,
            createdAt: new Date().toISOString(),
            completed: false,
          };
          setTasks((prev) => [newTask, ...prev]);
        }
      }
    }
    return lines.filter((l) => !l.startsWith("/")).join("\n").trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      setLoading(true);
      const taskContext = tasks
        .map((t) => `${t.id}: ${t.title} [${t.priority}] (${t.status})`)
        .join("\n");
      const templateContext = templates
        .map((tpl) => `${tpl.name}:\n${tpl.tasks.map((t) => `${t.title} [${t.priority}] (${t.status})`).join("\n")}`)
        .join("\n\n");
      const systemMessage: ChatMessage = {
        role: "system",
        content:
          `Current tasks:\n${taskContext}\n\nTemplates:\n${templateContext}\nUse /move TASK_ID COLUMN, /priority TASK_ID PRIORITY, or /add TITLE | PRIORITY | COLUMN to update the board.`,
      };
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(import.meta as any).env?.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: (import.meta as any).env?.VITE_OPENAI_MODEL || "gpt-4o-mini",
          stream: true,
          messages: [systemMessage, ...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let accumulated = "";

      while (!done) {
        const { value, done: doneReading } = await reader!.read();
        done = doneReading;
        accumulated += decoder.decode(value, { stream: true });
        const lines = accumulated.split("\n");
        accumulated = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === "data: [DONE]") {
            done = true;
            break;
          }
          if (trimmed.startsWith("data: ")) {
            const json = JSON.parse(trimmed.replace("data: ", ""));
            const text = json.choices?.[0]?.delta?.content;
            if (text) {
              assistantMessage.content += text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...assistantMessage };
                return updated;
              });
            }
          }
        }
      }
      assistantMessage.content = applyCommands(assistantMessage.content);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...assistantMessage };
        return updated;
      });
    } catch (err) {
      assistantMessage.content = "Something went wrong.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...assistantMessage };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex flex-col w-80 sm:w-96 h-96 bg-background border rounded-lg shadow-lg">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Planning Assistant</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div ref={containerRef} className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "p-2 rounded-md whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto" 
                    : "bg-muted mr-auto"
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="p-2 border-t">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your plan…"
              className="mb-2"
              rows={2}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Thinking…" : "Send"}
            </Button>
          </form>
        </div>
      ) : (
        <Button
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

