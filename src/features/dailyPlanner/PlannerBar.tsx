import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Sparkles, Sun, X, Trash2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/taskContext";
import type { ColumnKey, Priority, Task } from "@/FocusStudioStarter";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { extractTasksFromText, hasApiKey, type ExtractedTask } from "./extractTasks";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const GUIDED_QUESTIONS = [
  "Good morning. What's your #1 focus today?",
  "Any meetings, calls, or hard deadlines?",
  "A smaller task you can knock out between the big stuff?",
  "Anything else to capture? (or say 'done' to finish)",
];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const COLUMN_LABEL: Record<ColumnKey, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  backlog: "Backlog",
  done: "Done",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  P0: "bg-red-500/20 text-red-300 border-red-500/40",
  P1: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  P2: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

export default function PlannerBar() {
  const { setTasks } = useTasks();
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "freeform" | "guided">("idle");
  const [guidedStep, setGuidedStep] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedTask[] | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceRecorder();

  const userTurns = useMemo(
    () => messages.filter((m) => m.role === "user").map((m) => m.content),
    [messages]
  );

  // Ctrl/Cmd+K to focus, Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPanelOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === "Escape" && panelOpen) {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, extracted]);

  const closePanel = useCallback(() => {
    if (voice.recording) voice.cancel();
    setPanelOpen(false);
  }, [voice]);

  const resetConversation = () => {
    setMessages([]);
    setExtracted(null);
    setMode("idle");
    setGuidedStep(0);
    setInput("");
  };

  const startGuided = () => {
    setPanelOpen(true);
    setMode("guided");
    setGuidedStep(0);
    setExtracted(null);
    setMessages([{ role: "assistant", content: GUIDED_QUESTIONS[0] }]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const submitText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);

    if (mode === "guided") {
      const isDone =
        /^(done|that'?s it|nothing|no|end|finish)\b/i.test(trimmed) ||
        guidedStep + 1 >= GUIDED_QUESTIONS.length;
      if (isDone) {
        const allUserText = [...nextMessages.filter((m) => m.role === "user").map((m) => m.content)].join("\n");
        await runExtraction(allUserText, nextMessages);
      } else {
        const nextStep = guidedStep + 1;
        setGuidedStep(nextStep);
        setMessages([
          ...nextMessages,
          { role: "assistant", content: GUIDED_QUESTIONS[nextStep] },
        ]);
      }
    } else {
      // freeform: one-shot extraction from the single input
      setMode("freeform");
      await runExtraction(trimmed, nextMessages);
    }
  };

  const runExtraction = async (text: string, msgs: Message[]) => {
    setExtracting(true);
    setMessages([...msgs, { role: "assistant", content: "Thinking through that…" }]);
    try {
      const tasks = await extractTasksFromText(text);
      setExtracted(tasks);
      const summary = tasks.length
        ? `Found ${tasks.length} task${tasks.length === 1 ? "" : "s"}. Review below, edit if needed, then add them.`
        : "I couldn't pick out any concrete tasks from that. Try again?";
      setMessages([...msgs, { role: "assistant", content: summary }]);
    } catch (err: any) {
      setMessages([
        ...msgs,
        { role: "assistant", content: `Couldn't extract tasks: ${err?.message || "unknown error"}` },
      ]);
    } finally {
      setExtracting(false);
    }
  };

  const handleMicToggle = async () => {
    if (voice.recording) {
      const transcript = await voice.stop();
      if (transcript) {
        if (!panelOpen) setPanelOpen(true);
        await submitText(transcript);
      }
    } else {
      if (!panelOpen) setPanelOpen(true);
      await voice.start();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (voice.recording) {
      await handleMicToggle();
      return;
    }
    if (!panelOpen) setPanelOpen(true);
    await submitText(input);
  };

  const updateExtracted = (index: number, patch: Partial<ExtractedTask>) => {
    setExtracted((prev) => (prev ? prev.map((t, i) => (i === index ? { ...t, ...patch } : t)) : prev));
  };

  const removeExtracted = (index: number) => {
    setExtracted((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const commitExtracted = () => {
    if (!extracted || extracted.length === 0) return;
    const nowIso = new Date().toISOString();
    const today = new Date().toISOString().slice(0, 10);
    const newTasks: Task[] = extracted.map((e) => ({
      id: uid(),
      title: e.title,
      notes: e.notes,
      priority: e.priority,
      status: e.column,
      tags: [],
      createdAt: nowIso,
      completed: false,
      due: e.column === "now" ? today : undefined,
    }));
    setTasks((prev) => [...newTasks, ...prev]);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Added ${newTasks.length} task${newTasks.length === 1 ? "" : "s"} to your board.` },
    ]);
    setExtracted(null);
    setMode("idle");
    setGuidedStep(0);
  };

  const placeholder = voice.recording
    ? "Listening… click the stop button when done"
    : voice.transcribing
    ? "Transcribing…"
    : mode === "guided"
    ? "Type your answer, or say 'done' to finish"
    : "Brain-dump your day — I'll turn it into tasks";

  return (
    <>
      {/* Expanded panel */}
      {panelOpen && (
        <div className="fixed inset-x-0 bottom-[88px] z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>
                  {mode === "guided"
                    ? `Guided plan · step ${Math.min(guidedStep + 1, GUIDED_QUESTIONS.length)} of ${GUIDED_QUESTIONS.length}`
                    : mode === "freeform"
                    ? "Freeform capture"
                    : "Daily planner"}
                </span>
                {!hasApiKey() && (
                  <span className="text-xs text-amber-400">
                    · no API key — using line-split fallback
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetConversation}
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={closePanel} title="Close (Esc)">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
              {messages.length === 0 && (
                <div className="text-muted-foreground text-center py-6">
                  Describe your day, or click <span className="font-medium">🌅 Plan today</span> for a guided walkthrough.
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-2 rounded-xl whitespace-pre-wrap max-w-[85%] leading-relaxed",
                    m.role === "user"
                      ? "bg-accent/80 text-accent-foreground ml-auto"
                      : "bg-muted text-foreground mr-auto"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {extracting && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs px-3">
                  <Loader2 className="h-3 w-3 animate-spin" /> Extracting tasks…
                </div>
              )}

              {extracted && extracted.length > 0 && (
                <div className="mt-3 border border-border rounded-xl bg-background/60 p-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Preview · edit before adding
                  </div>
                  {extracted.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-card/60 border border-border rounded-lg px-2 py-1.5"
                    >
                      <input
                        value={t.title}
                        onChange={(e) => updateExtracted(idx, { title: e.target.value })}
                        className="flex-1 bg-transparent text-sm outline-none focus:ring-0 border-0"
                      />
                      <select
                        value={t.priority}
                        onChange={(e) => updateExtracted(idx, { priority: e.target.value as Priority })}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded border bg-transparent",
                          PRIORITY_STYLE[t.priority]
                        )}
                      >
                        <option value="P0">P0</option>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                      </select>
                      <select
                        value={t.column}
                        onChange={(e) => updateExtracted(idx, { column: e.target.value as ColumnKey })}
                        className="text-xs px-2 py-0.5 rounded border border-border bg-transparent text-muted-foreground"
                      >
                        {(Object.keys(COLUMN_LABEL) as ColumnKey[])
                          .filter((k) => k !== "done")
                          .map((k) => (
                            <option key={k} value={k}>
                              {COLUMN_LABEL[k]}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => removeExtracted(idx)}
                        className="text-muted-foreground hover:text-red-400 p-1"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    onClick={commitExtracted}
                    className="w-full mt-2"
                    disabled={extracted.length === 0}
                  >
                    Add {extracted.length} task{extracted.length === 1 ? "" : "s"} to board
                  </Button>
                </div>
              )}

              {voice.error && (
                <div className="text-xs text-red-400 px-3">{voice.error}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom composer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {!panelOpen && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={startGuided}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted transition"
              >
                <Sun className="h-3.5 w-3.5" /> Plan today
              </button>
              <button
                onClick={() => {
                  setPanelOpen(true);
                  setMode("idle");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted transition"
              >
                <Sparkles className="h-3.5 w-3.5" /> Brain-dump
              </button>
              <span className="text-xs text-muted-foreground ml-auto">
                <kbd className="px-1.5 py-0.5 border border-border rounded bg-muted/40">Ctrl+K</kbd> to focus
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={voice.transcribing || (!voice.isSupported && !voice.recording)}
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center transition shrink-0",
                voice.recording
                  ? "bg-red-500/90 text-white animate-pulse"
                  : "bg-muted hover:bg-muted/70 text-foreground"
              )}
              title={voice.recording ? "Stop recording" : "Start voice"}
            >
              {voice.transcribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : voice.recording ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onFocus={() => setPanelOpen(true)}
              rows={1}
              placeholder={placeholder}
              className="flex-1 resize-none bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 max-h-40"
              style={{ minHeight: 44 }}
            />

            <Button
              type="submit"
              className="h-11 w-11 p-0 shrink-0"
              disabled={extracting || voice.transcribing || (!input.trim() && !voice.recording)}
              title="Send (Enter)"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
