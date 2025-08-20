import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Plus,
  CheckCircle2,
  Sun,
  Moon,
  Contrast,
  Timer,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Settings2,
  Flame,
} from "lucide-react";

// ------------------------------------------------------------
// Focus Studio Starter: Bare-bones, remixable UI/UX scaffold
// Stack: React + Tailwind + shadcn/ui + lucide + framer-motion
// - LocalStorage persistence
// - Minimal template import/export (JSON)
// - Columns: Now / Next / Later / Backlog / Done
// - Focus Mode with Pomodoro timer (25/5 or 50/10)
// - Gentle theme options: Light / Dark / Comfort (low-contrast)
// ------------------------------------------------------------

// Types
export type ColumnKey = "now" | "next" | "later" | "backlog" | "done";
export type Priority = "P0" | "P1" | "P2";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  status: ColumnKey;
  estimate?: number; // pomodoros
  tags?: string[];
  due?: string; // ISO date
  completed?: boolean;
  createdAt: string; // ISO
  completedAt?: string | null;
};

export type Template = {
  name: string;
  tasks: Task[];
  columns?: ColumnKey[];
};

// Utils
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

const DEFAULT_COLUMNS: ColumnKey[] = ["now", "next", "later", "backlog", "done"];

// Example templates (remix freely)
const TEMPLATES: Template[] = [
  {
    name: "Blank",
    tasks: [],
    columns: DEFAULT_COLUMNS,
  },
  {
    name: "Deep Work Day",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Plan day in 5 minutes", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 1 },
      { id: uid(), title: "Two 50-min focus blocks", priority: "P0", status: "next", createdAt: new Date().toISOString(), estimate: 2 },
      { id: uid(), title: "Inbox Zero (15m)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1 },
      { id: uid(), title: "Walk + water + stretch", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1 },
    ],
  },
  // ——— DAB-focused templates ———
  {
    name: "DAB GTM Sprint — Today",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Finalize GitHub GTM one-pager", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["DAB","GTM"] },
      { id: uid(), title: "Assemble demo storyboard screenshots", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["DAB","Demo"] },

      { id: uid(), title: "Update homepage: 5 scholarships secured + 20 seats remaining", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["DAB","Landing"] },
      { id: uid(), title: "Draft sponsor email with projected outcomes", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Partnership","Email"] },

      { id: uid(), title: "Prep GTM metrics table (CAC, LTV, MRR scenarios)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["GTM","Metrics"] },
      { id: uid(), title: "Record 90s demo teaser", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Video","Social"] },

      { id: uid(), title: "Set up UTM tracking for GitHub ref", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Analytics"] },
    ],
  },
  {
    name: "Partnership Day — Outreach & Collab",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Scoutflo: finalize one-pager & send assets", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Partnership","Scoutflo"] },
      { id: uid(), title: "Zenduty: tailor proposal (on-call + incident sims)", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Partnership","Zenduty"] },

      { id: uid(), title: "ClickHouse for Observability: outreach email + CTA", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["ClickHouse","Observability"] },
      { id: uid(), title: "Collect 3 logo/brand guidelines from partners", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Brand"] },

      { id: uid(), title: "Draft social co-announcement copy options", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Social","Copy"] },
      { id: uid(), title: "Create shared folder structure for partner assets", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops"] },

      { id: uid(), title: "Spreadsheet: partner tracking (stage, owner, next step)", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["CRM"] },
    ],
  },
  {
    name: "Content Ship Day — Newsletter + Social",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Outline newsletter (proof + momentum + CTA)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Newsletter","DAB"] },
      { id: uid(), title: "Write newsletter draft v1", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Writing"] },

      { id: uid(), title: "Edit to 9.9/10 (clarity, pacing, punchy CTA)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Editing"] },
      { id: uid(), title: "Create LinkedIn carousel (5–7 slides)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Design","Social"] },

      { id: uid(), title: "Record 60–90s video teaser", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Video"] },
      { id: uid(), title: "Schedule posts + newsletter send", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Scheduling"] },

      { id: uid(), title: "Collect 3 quick testimonials for social proof", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Testimonial"] },
    ],
  },
  {
    name: "Interview Prep — Observability Walkthrough",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Spin up EKS (sample app + Ingress/ALB)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 3, tags: ["EKS","K8s"] },
      { id: uid(), title: "Instrument APM (traces, metrics, logs)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["APM","Observability"] },

      { id: uid(), title: "Run synthetic error + latency scenarios", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["SRE","Chaos"] },
      { id: uid(), title: "Prepare 10 FAQ answers (TSM focus)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Interview"] },

      { id: uid(), title: "Tear-down + cleanup script", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops","Cleanup"] },
      { id: uid(), title: "Deck: concise demo flow (5 slides)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Deck"] },

      { id: uid(), title: "Practice 15-min live walkthrough", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Practice"] },
    ],
  },
  {
    name: "Ops & Finance — Cleanup",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Audit seat counter on landing page", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["DAB","Landing"] },
      { id: uid(), title: "Payment flow sanity check (test txn + redirect)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Payments"] },

      { id: uid(), title: "Webhook signature validation notes", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Webhook"] },
      { id: uid(), title: "Invoice template + GST checklist", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Finance"] },

      { id: uid(), title: "CRM: tag new leads + next actions", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["CRM"] },
      { id: uid(), title: "Auto-reply for scholarship inquiries", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops","Automation"] },

      { id: uid(), title: "Back up docs & assets", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Backup"] },
    ],
  },
  {
    name: "Focus Studio OSS — Shipping",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Repo init + MIT license + README", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["OSS","Repo"] },
      { id: uid(), title: "Add two starter templates (Deep Work, Sprint Day)", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Templates"] },

      { id: uid(), title: "Set up shadcn/ui + Tailwind config", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["UI"] },
      { id: uid(), title: "Demo GIFs (focus mode + import/export)", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Docs","Demo"] },

      { id: uid(), title: "Issue templates + contribution guide", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["OSS"] },
      { id: uid(), title: "Publish template on GitHub + tweet", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Launch"] },

      { id: uid(), title: "Add JSON schema for templates", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 2, tags: ["DX"] },
    ],
  },
  {
    name: "Calm Reset — Light Day",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Plan day in 5 minutes", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Routine"] },
      { id: uid(), title: "One 50-min deep work block", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Focus"] },

      { id: uid(), title: "Inbox Zero (15m)", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops"] },
      { id: uid(), title: "Walk + water + stretch", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Health"] },

      { id: uid(), title: "Read 20 pages (AI/DevOps)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Learning"] },
      { id: uid(), title: "Reflect & journal (10m)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Mindset"] },
    ],
  },
];

// Local storage helpers
const LS_KEY = "focus_studio_state_v1";
const THEME_KEY = "focus_studio_theme_v1";

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

// Timer hook (Pomodoro)
function usePomodoro(initialMode: "focus" | "break" = "focus") {
  const [mode, setMode] = useState<"focus" | "break">(initialMode);
  const [running, setRunning] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState<25 | 50>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(focusMinutes * 60);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setSecondsLeft((mode === "focus" ? focusMinutes : breakLength()) * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMinutes, mode]);

  const breakLength = () => (focusMinutes === 50 ? 10 : 5);
  const totalSeconds = mode === "focus" ? focusMinutes * 60 : breakLength() * 60;
  const progress = 100 - Math.floor((secondsLeft / totalSeconds) * 100);

  const tick = () => setSecondsLeft((s) => Math.max(0, s - 1));

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0) {
      // auto-switch
      const next = mode === "focus" ? "break" : "focus";
      setMode(next);
      setSecondsLeft((next === "focus" ? focusMinutes : breakLength()) * 60);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setSecondsLeft((mode === "focus" ? focusMinutes : breakLength()) * 60);
  };

  const display = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  return {
    mode,
    setMode,
    running,
    start,
    pause,
    reset,
    focusMinutes,
    setFocusMinutes,
    secondsLeft,
    display,
    progress,
  } as const;
}

// Pill for priority
const PriorityBadge = ({ p }: { p: Priority }) => {
  const map: Record<Priority, string> = {
    P0: "bg-red-500/10 text-red-600 border-red-500/30",
    P1: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    P2: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  };
  return (
    <Badge className={`border ${map[p]} font-medium`}>{p}</Badge>
  );
};

// Task card (compact)
function TaskCard({ task, onUpdate, onMove }: {
  task: Task;
  onUpdate: (patch: Partial<Task>) => void;
  onMove: (to: ColumnKey) => void;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <Card className="mb-2 shadow-sm border-muted/40">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <button
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              onClick={() =>
                onUpdate({ completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null, status: !task.completed ? "done" : task.status })
              }
              className={`mt-0.5 rounded-full border w-5 h-5 flex items-center justify-center ${task.completed ? "bg-emerald-500 text-white border-emerald-500" : "border-muted-foreground/30"}`}
            >
              {task.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>
                <PriorityBadge p={task.priority} />
                {task.estimate ? (
                  <span className="text-xs text-muted-foreground">⏱️ {task.estimate} pom</span>
                ) : null}
              </div>
              {task.notes ? (
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{task.notes}</p>
              ) : null}
              <div className="flex flex-wrap gap-1 mt-1">
                {(task.tags ?? []).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>
                ))}
                {task.due ? (
                  <Badge variant="secondary" className="text-xs">Due {new Date(task.due).toLocaleDateString()}</Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Select onValueChange={(v) => onMove(v as ColumnKey)}>
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="Move to…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Now</SelectItem>
                    <SelectItem value="next">Next</SelectItem>
                    <SelectItem value="later">Later</SelectItem>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => onUpdate({})}>
                  <Settings2 className="h-4 w-4 mr-1" /> Edit
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Column wrapper
function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[260px]">
      <h3 className="text-sm font-semibold tracking-wide text-muted-foreground mb-2 uppercase">{title}</h3>
      <div className="rounded-2xl border bg-card p-2">
        {children}
      </div>
    </div>
  );
}

export default function FocusStudioStarter() {
  const [tasks, setTasks] = useLocalStorage<Task[]>(LS_KEY, []);
  const [theme, setTheme] = useLocalStorage<"light" | "dark" | "comfort">(THEME_KEY, "comfort");
  const [focusMode, setFocusMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("P1");
  const [quickTarget, setQuickTarget] = useState<ColumnKey>("now");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string>("Blank");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const timer = usePomodoro("focus");

  // Derived
  const byCol = useMemo(() => {
    const map: Record<ColumnKey, Task[]> = { now: [], next: [], later: [], backlog: [], done: [] };
    tasks.forEach((t) => map[t.status].push(t));
    return map;
  }, [tasks]);

  const completedToday = useMemo(() => tasks.filter((t) => t.completed && isToday(t.completedAt)).length, [tasks]);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme === "dark" ? "dark" : "light");
  }, [theme]);

  const addTask = () => {
    if (!quickTitle.trim()) return;
    const t: Task = {
      id: uid(),
      title: quickTitle.trim(),
      priority: quickPriority,
      status: quickTarget,
      estimate: undefined,
      tags: [],
      createdAt: new Date().toISOString(),
      completed: false,
    };
    setTasks((x) => [t, ...x]);
    setQuickTitle("");
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((x) => x.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const moveTask = (id: string, to: ColumnKey) => updateTask(id, { status: to });

  const removeTask = (id: string) => setTasks((x) => x.filter((t) => t.id !== id));

  const applyTemplate = (tplName: string) => {
    const tpl = TEMPLATES.find((t) => t.name === tplName);
    if (!tpl) return;
    // Ensure fresh IDs & timestamps
    const cloned = tpl.tasks.map((t) => ({ ...t, id: uid(), createdAt: new Date().toISOString(), completed: false, completedAt: null }));
    setTasks(cloned);
    setActiveTemplate(tplName);
  };

  const exportTemplate = () => {
    const data: Template = { name: "My Focus Template", tasks, columns: DEFAULT_COLUMNS };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focus-template-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = () => {
    try {
      const parsed = JSON.parse(templateText) as Template;
      const normalized = (parsed.tasks || []).map((t) => ({ ...t, id: uid(), createdAt: new Date().toISOString(), completed: false, completedAt: null }));
      setTasks(normalized);
      setActiveTemplate(parsed.name || "Imported");
      setTemplateOpen(false);
      setTemplateText("");
    } catch (e) {
      alert("Invalid template JSON");
    }
  };

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  // Soft, comfortable contrast theme wrapper
  const comfort = theme === "comfort";

  return (
    <div className={`min-h-[100dvh] w-full ${comfort ? "bg-gradient-to-b from-muted/40 to-background" : "bg-background"}`}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Focus Studio Starter</h1>
          <Badge variant="secondary" className="ml-1">OSS</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Select value={activeTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={exportTemplate}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Upload className="h-4 w-4 mr-1" /> Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Template JSON</DialogTitle>
                </DialogHeader>
                <Textarea value={templateText} onChange={(e) => setTemplateText(e.target.value)} placeholder="Paste JSON here" className="min-h-[200px]" />
                <DialogFooter>
                  <Button onClick={importTemplate}>Import</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="h-6 w-px bg-border mx-1" />

            <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><span className="inline-flex items-center gap-2"><Sun className="h-4 w-4" /> Light</span></SelectItem>
                <SelectItem value="dark"><span className="inline-flex items-center gap-2"><Moon className="h-4 w-4" /> Dark</span></SelectItem>
                <SelectItem value="comfort"><span className="inline-flex items-center gap-2"><Contrast className="h-4 w-4" /> Comfort</span></SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-1">
              <Switch id="focus" checked={focusMode} onCheckedChange={setFocusMode} />
              <label htmlFor="focus" className="text-sm text-muted-foreground select-none flex items-center gap-1">
                {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Focus mode
              </label>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick add + Timer */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 border-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Quick Add</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-12 gap-2">
              <Input
                placeholder="Add a task and press Enter"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                className="sm:col-span-6"
              />
              <Select value={quickPriority} onValueChange={(v) => setQuickPriority(v as Priority)}>
                <SelectTrigger className="sm:col-span-2">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 (Critical)</SelectItem>
                  <SelectItem value="P1">P1 (High)</SelectItem>
                  <SelectItem value="P2">P2 (Normal)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={quickTarget} onValueChange={(v) => setQuickTarget(v as ColumnKey)}>
                <SelectTrigger className="sm:col-span-2">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Now</SelectItem>
                  <SelectItem value="next">Next</SelectItem>
                  <SelectItem value="later">Later</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addTask} className="sm:col-span-2">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardContent>
          </Card>

          {/* Timer */}
          <Card className="border-muted/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4" /> Pomodoro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-mono tabular-nums tracking-tight">{timer.display}</div>
                <Badge variant={timer.mode === "focus" ? "default" : "secondary"} className="uppercase">{timer.mode}</Badge>
              </div>
              <Progress value={timer.progress} />
              <div className="flex items-center gap-2">
                {!timer.running ? (
                  <Button size="sm" onClick={timer.start}><Play className="h-4 w-4 mr-1" /> Start</Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={timer.pause}><Pause className="h-4 w-4 mr-1" /> Pause</Button>
                )}
                <Button size="sm" variant="ghost" onClick={timer.reset}><RotateCcw className="h-4 w-4 mr-1" /> Reset</Button>
                <Select value={String(timer.focusMinutes)} onValueChange={(v) => timer.setFocusMinutes(Number(v) as 25 | 50)}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25/5</SelectItem>
                    <SelectItem value="50">50/10</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => timer.setMode(timer.mode === "focus" ? "break" : "focus")}>
                  <ArrowRightLeft className="h-4 w-4 mr-1" /> Switch
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Completed today: <span className="font-semibold">{completedToday}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Focus mode banner */}
        <AnimatePresence>
          {focusMode && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <Card className="border-primary/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Focus mode shows only the <span className="font-medium">Now</span> column and enlarges the active task.</div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedTaskId(byCol.now[0]?.id || null)}>
                      Use first Now task
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board */}
        {!focusMode ? (
          <div className="grid lg:grid-cols-5 md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4">
            <Column title="Now">
              <AnimatePresence mode="popLayout">
                {byCol.now.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={(p) => updateTask(t.id, p)} onMove={(to) => moveTask(t.id, to)} />
                ))}
              </AnimatePresence>
            </Column>
            <Column title="Next">
              <AnimatePresence mode="popLayout">
                {byCol.next.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={(p) => updateTask(t.id, p)} onMove={(to) => moveTask(t.id, to)} />
                ))}
              </AnimatePresence>
            </Column>
            <Column title="Later">
              <AnimatePresence mode="popLayout">
                {byCol.later.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={(p) => updateTask(t.id, p)} onMove={(to) => moveTask(t.id, to)} />
                ))}
              </AnimatePresence>
            </Column>
            <Column title="Backlog">
              <AnimatePresence mode="popLayout">
                {byCol.backlog.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={(p) => updateTask(t.id, p)} onMove={(to) => moveTask(t.id, to)} />
                ))}
              </AnimatePresence>
            </Column>
            <Column title="Done">
              <AnimatePresence mode="popLayout">
                {byCol.done.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={(p) => updateTask(t.id, p)} onMove={(to) => moveTask(t.id, to)} />
                ))}
              </AnimatePresence>
            </Column>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4">
            <div className="lg:col-span-3 md:col-span-2">
              <Card className="border-muted/40">
                <CardHeader>
                  <CardTitle className="text-base">Now</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTask ? (
                    <div className="space-y-3">
                      <div className="text-2xl font-semibold tracking-tight">{selectedTask.title}</div>
                      {selectedTask.notes ? (
                        <p className="text-muted-foreground whitespace-pre-wrap">{selectedTask.notes}</p>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => { setNotesOpen(true); setNotesDraft(selectedTask.notes || ""); }}>Add notes</Button>
                      )}
                      <div className="flex items-center gap-2">
                        <PriorityBadge p={selectedTask.priority} />
                        {selectedTask.estimate ? <Badge variant="outline">~{selectedTask.estimate} pom</Badge> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => updateTask(selectedTask.id, { completed: true, completedAt: new Date().toISOString(), status: "done" })}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Done
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => moveTask(selectedTask.id, "next")}>Move to Next</Button>
                        <Button size="sm" variant="ghost" onClick={() => removeTask(selectedTask.id)}>Remove</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a task from Now to lock focus.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 md:col-span-2">
              <Card className="border-muted/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4" /> Pomodoro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-5xl font-mono tabular-nums tracking-tight">{timer.display}</div>
                  <Progress value={timer.progress} />
                  <div className="flex items-center gap-2">
                    {!timer.running ? (
                      <Button onClick={timer.start}><Play className="h-4 w-4 mr-1" /> Start</Button>
                    ) : (
                      <Button variant="secondary" onClick={timer.pause}><Pause className="h-4 w-4 mr-1" /> Pause</Button>
                    )}
                    <Button variant="ghost" onClick={timer.reset}><RotateCcw className="h-4 w-4 mr-1" /> Reset</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(timer.focusMinutes)} onValueChange={(v) => timer.setFocusMinutes(Number(v) as 25 | 50)}>
                      <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25/5</SelectItem>
                        <SelectItem value="50">50/10</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => timer.setMode(timer.mode === "focus" ? "break" : "focus")}>
                      <ArrowRightLeft className="h-4 w-4 mr-1" /> Switch
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="mt-4 border-muted/40">
                <CardHeader>
                  <CardTitle className="text-base">Now Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {byCol.now.length ? (
                    byCol.now.map((t) => (
                      <Button key={t.id} variant={t.id === selectedTaskId ? "default" : "ghost"} className="w-full justify-start" onClick={() => setSelectedTaskId(t.id)}>
                        {t.title}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks in Now.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Notes editor dialog for selected task */}
        <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notes</DialogTitle>
            </DialogHeader>
            <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} className="min-h-[200px]" />
            <DialogFooter>
              <Button onClick={() => { if (selectedTask) updateTask(selectedTask.id, { notes: notesDraft }); setNotesOpen(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Simple admin/debug */}
        <Tabs defaultValue="help" className="mt-2">
          <TabsList>
            <TabsTrigger value="help">Help</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>
          <TabsContent value="help" className="text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Use <span className="font-medium">Quick Add</span> to create tasks. Choose priority & target column.</li>
              <li>Move tasks between columns via the <span className="font-medium">Move to…</span> selector.</li>
              <li><span className="font-medium">Focus mode</span> shows only <em>Now</em> and an enlarged active task with a Pomodoro timer.</li>
              <li>Templates: apply preset, <span className="font-medium">Export</span> to JSON, <span className="font-medium">Import</span> to load your own.</li>
              <li>Themes: Light, Dark, and <span className="font-medium">Comfort</span> for softer contrast.</li>
              <li>All data is stored locally in your browser (no backend required).</li>
            </ul>
          </TabsContent>
          <TabsContent value="about" className="text-sm text-muted-foreground">
            <p>
              <span className="font-medium">Focus Studio Starter</span> is a minimal, open-source scaffold for daily focus. Remix it into your own flow: columns, templates, scoring, integrations.
            </p>
          </TabsContent>
          <TabsContent value="danger" className="space-y-2">
            <Button variant="destructive" onClick={() => { if (confirm("Clear all tasks?")) setTasks([]); }}>Clear Tasks</Button>
            <Button variant="secondary" onClick={() => applyTemplate("Blank")}>Reset to Blank</Button>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-10 text-center text-xs text-muted-foreground">
        Built with ❤️ • MIT License • Starter UI for remixing
      </footer>
    </div>
  );
}