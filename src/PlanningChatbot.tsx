import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, open]);

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
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(import.meta as any).env?.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: (import.meta as any).env?.VITE_OPENAI_MODEL || "gpt-4o-mini",
          stream: true,
          messages: [...messages, userMessage].map((m) => ({
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

