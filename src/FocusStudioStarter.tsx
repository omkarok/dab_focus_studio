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
import { Badge } from "@/components/ui/badge";
import { sortByPriority } from "@/features/enhancedTaskManagement";
import { computeStats } from "@/features/analyticsReporting";
import { generateSubtasks } from "@/features/aiCommandCenter";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Sparkles,
  Trash2,
  Calendar,
  Tag,
  Clock,
  ChevronRight,
  LayoutGrid,
  HelpCircle,
  Zap,
} from "lucide-react";
import { useTasks } from "@/lib/taskContext";
import { useTemplates, DEFAULT_COLUMNS } from "@/lib/templateContext";
import { useProjects } from "@/lib/projectContext";
import { useTimeTracking } from "@/lib/timeContext";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import CalendarView from "@/components/CalendarView";
import ViewToggle from "@/components/ViewToggle";
import TimeTracker from "@/components/TimeTracker";
import TimeReport from "@/components/TimeReport";
import { AssigneePicker } from "@/components/AssigneePicker";
import { useWorkspace } from "@/lib/workspaceContext";
import { newUuid as uid } from "@/lib/utils";

// ------------------------------------------------------------
// AI Consulting Studio: Local task & project manager
// for AI consulting engagements
// Stack: React + Tailwind + shadcn/ui + lucide + framer-motion
// - LocalStorage persistence
// - Templates for consulting workflows (discovery, workshops, PoCs, etc.)
// - Columns: Now / Next / Later / Backlog / Done
// - Focus Mode with Pomodoro timer (25/5 or 50/10)
// - Theme options: Light / Dark / Comfort (low-contrast)
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
  projectId?: string;
  assigneeId?: string;
};

export type Template = {
  name: string;
  tasks: Task[];
  columns?: ColumnKey[];
};

// Utils — uid() must return a UUID; task.id maps to a Postgres uuid column.
const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

// Local storage helpers
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
function usePomodoro(initialMode: "focus" | "break" = "focus", onFocusComplete?: () => void) {
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
      if (mode === "focus" && onFocusComplete) onFocusComplete();
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
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  return { mode, setMode, running, start, pause, reset, focusMinutes, setFocusMinutes, secondsLeft, display, progress } as const;
}

// Priority badge
const PRIORITY_STYLES: Record<Priority, string> = {
  P0: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
  P1: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  P2: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  P0: "Critical",
  P1: "High",
  P2: "Normal",
};

const PriorityBadge = ({ p }: { p: Priority }) => (
  <Badge className={`border ${PRIORITY_STYLES[p]} font-medium text-[11px]`}>{p}</Badge>
);

// Column config
const COLUMN_CONFIG: Record<ColumnKey, { label: string; color: string; emptyText: string }> = {
  now:     { label: "Now",     color: "text-accent",           emptyText: "Nothing active — pick a task to start" },
  next:    { label: "Next",    color: "text-amber-500",        emptyText: "Queue up your next priorities" },
  later:   { label: "Later",   color: "text-blue-500",         emptyText: "Park items for later this week" },
  backlog: { label: "Backlog", color: "text-muted-foreground",  emptyText: "Capture ideas and future work" },
  done:    { label: "Done",    color: "text-emerald-500",      emptyText: "Completed tasks appear here" },
};

// --- Task Card ---
function TaskCard({ task, onUpdate, onMove, onGenerateSubtasks, onSelect }: {
  task: Task;
  onUpdate: (patch: Partial<Task>) => void;
  onMove: (to: ColumnKey) => void;
  onGenerateSubtasks?: (task: Task) => void;
  onSelect?: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      {...attributes}
      {...listeners}
      onClick={() => onSelect?.(task.id)}
    >
      <div className="task-card mb-2 rounded-xl border border-border bg-card p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <button
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({
                completed: !task.completed,
                completedAt: !task.completed ? new Date().toISOString() : null,
                status: !task.completed ? "done" : task.status,
              });
            }}
            className={`mt-0.5 shrink-0 rounded-full border w-5 h-5 flex items-center justify-center transition-colors ${task.completed ? "bg-emerald-500 text-white border-emerald-500" : "border-muted-foreground/30 hover:border-accent"}`}
          >
            {task.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-medium leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {task.title}
              </span>
              <PriorityBadge p={task.priority} />
              {task.estimate ? (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />{task.estimate}
                </span>
              ) : null}
            </div>
            {task.notes ? (
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap mt-1 leading-relaxed">{task.notes}</p>
            ) : null}
            {((task.tags ?? []).length > 0 || task.due) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(task.tags ?? []).map((t) => (
                  <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">#{t}</span>
                ))}
                {task.due ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Calendar className="h-2.5 w-2.5" />{new Date(task.due).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <AssigneePicker
              assigneeId={task.assigneeId}
              onChange={(id) => onUpdate({ assigneeId: id })}
              size="sm"
            />
          </div>
        </div>
        {/* Action row — shown on hover via CSS */}
        <div className="task-actions flex items-center gap-1.5 pt-1 border-t border-border/50">
          <Select onValueChange={(v) => onMove(v as ColumnKey)}>
            <SelectTrigger className="h-7 w-[120px] text-xs" onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Now</SelectItem>
              <SelectItem value="next">Next</SelectItem>
              <SelectItem value="later">Later</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onSelect?.(task.id); }}>
            <Settings2 className="h-3 w-3 mr-1" />Edit
          </Button>
          {onGenerateSubtasks ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onGenerateSubtasks(task); }}>
              <Sparkles className="h-3 w-3 mr-1" />AI
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// --- Column ---
function Column({ id, title, count, children }: { id: ColumnKey; title: string; count: number; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  const config = COLUMN_CONFIG[id];
  const isNow = id === "now";

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[240px]">
      <div className="flex items-center gap-2 mb-2 px-1">
        <h3 className={`text-xs font-semibold tracking-wider uppercase ${config.color}`}>{title}</h3>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{count}</span>
      </div>
      <div className={`column-drop-zone rounded-xl border p-2 min-h-[120px] ${isNow ? "column-now" : "bg-card/50"}`}>
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60 italic">
            {config.emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function FocusStudioStarter() {
  const { tasks, setTasks, updateTask } = useTasks();
  const { templates, setTemplates } = useTemplates();
  const { activeProject, activeProjectId } = useProjects();
  const { profiles } = useWorkspace();
  const timeTracking = useTimeTracking();
  const assigneeLabel = (id: string): string => {
    const p = profiles[id];
    return p?.name ?? p?.email ?? "Unknown";
  };
  const [theme, setTheme] = useLocalStorage<"light" | "dark" | "comfort">(THEME_KEY, "comfort");
  const [focusMode, setFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "calendar">("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("P1");
  const [quickTarget, setQuickTarget] = useState<ColumnKey>("now");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0]?.name || "Blank");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [timeReportOpen, setTimeReportOpen] = useState(false);

  // Editable fields for the task detail dialog
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("P1");
  const [editEstimate, setEditEstimate] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDue, setEditDue] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const timer = usePomodoro("focus", () => {
    // Auto-log a time entry when a Pomodoro focus session completes
    if (selectedTaskId) {
      timeTracking.logCompleted(selectedTaskId, activeProjectId, timer.focusMinutes, "Pomodoro session");
    }
  });

  // Derived
  const byCol = useMemo(() => {
    const map: Record<ColumnKey, Task[]> = { now: [], next: [], later: [], backlog: [], done: [] };
    tasks.forEach((t) => map[t.status].push(t));
    (Object.keys(map) as ColumnKey[]).forEach((col) => {
      map[col] = sortByPriority(map[col]);
    });
    return map;
  }, [tasks]);
  const stats = useMemo(() => computeStats(tasks), [tasks]);
  const completedToday = useMemo(() => tasks.filter((t) => t.completed && isToday(t.completedAt)).length, [tasks]);
  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const taskNames = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme === "dark" ? "dark" : "light");
  }, [theme]);

  // Sync edit fields when selected task changes
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditPriority(selectedTask.priority);
      setEditEstimate(selectedTask.estimate?.toString() ?? "");
      setEditTags((selectedTask.tags ?? []).join(", "));
      setEditDue(selectedTask.due ?? "");
    }
  }, [selectedTask]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const from = tasks.find((t) => t.id === activeId)?.status;
    const overTask = tasks.find((t) => t.id === overId);
    const to: ColumnKey | undefined = overTask ? overTask.status : (overId as ColumnKey);
    if (!from || !to || from === to) return;
    setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: to } : t)));
  };

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

  const moveTask = (id: string, to: ColumnKey) => updateTask(id, { status: to });
  const removeTask = (id: string) => {
    setTasks((x) => x.filter((t) => t.id !== id));
    setTaskDialogOpen(false);
    setSelectedTaskId(null);
  };

  const generateSubtasksFor = async (task: Task) => {
    setSubtaskLoading(true);
    const subs = await generateSubtasks({ title: task.title, notes: task.notes });
    setSubtaskLoading(false);
    if (subs.length) {
      const newTasks = subs.map((title) => ({
        id: uid(),
        title,
        priority: task.priority,
        status: task.status,
        createdAt: new Date().toISOString(),
        completed: false,
      }));
      setTasks((prev) => [...prev, ...newTasks]);
    }
  };

  const applyTemplate = (tplName: string) => {
    const tpl = templates.find((t) => t.name === tplName);
    if (!tpl) return;
    const cloned = tpl.tasks.map((t) => ({ ...t, id: uid(), createdAt: new Date().toISOString(), completed: false, completedAt: null }));
    setTasks(cloned);
    setActiveTemplate(tplName);
  };

  const exportTemplate = () => {
    const data: Template = { name: "My Consulting Template", tasks, columns: DEFAULT_COLUMNS };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consulting-template-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = () => {
    try {
      const parsed = JSON.parse(templateText) as Template;
      const normalized = (parsed.tasks || []).map((t) => ({ ...t, id: uid(), createdAt: new Date().toISOString(), completed: false, completedAt: null }));
      const tpl: Template = { name: parsed.name || "Imported", tasks: normalized, columns: parsed.columns || DEFAULT_COLUMNS };
      setTemplates((prev) => [...prev, tpl]);
      setTasks(normalized);
      setActiveTemplate(tpl.name);
      setTemplateOpen(false);
      setTemplateText("");
    } catch (e) {
      alert("Invalid template JSON");
    }
  };

  const saveTaskEdits = () => {
    if (!selectedTask) return;
    const parsed: Partial<Task> = {
      title: editTitle.trim() || selectedTask.title,
      priority: editPriority,
      estimate: editEstimate ? Number(editEstimate) : undefined,
      tags: editTags ? editTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      due: editDue || undefined,
    };
    updateTask(selectedTask.id, parsed);
  };

  const comfort = theme === "comfort";

  // Helper to render columns in board
  const renderColumn = (colId: ColumnKey) => (
    <Column key={colId} id={colId} title={COLUMN_CONFIG[colId].label} count={byCol[colId].length}>
      <SortableContext id={colId} items={byCol[colId].map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <AnimatePresence mode="popLayout">
          {byCol[colId].map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onUpdate={(p) => updateTask(t.id, p)}
              onMove={(to) => moveTask(t.id, to)}
              onGenerateSubtasks={generateSubtasksFor}
              onSelect={() => { setSelectedTaskId(t.id); setTaskDialogOpen(true); }}
            />
          ))}
        </AnimatePresence>
      </SortableContext>
    </Column>
  );

  return (
    <div className={`min-h-[100dvh] w-full ${comfort ? "comfort-bg" : "bg-background"}`}>
      {/* ===== Top Bar ===== */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md border-b border-border"
        style={{
          backgroundColor: activeProject.color
            ? `color-mix(in srgb, ${activeProject.color} 4%, var(--background) 96%)`
            : undefined,
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 py-2.5">
          {/* Row 1: Brand + main controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <h1 className="text-base font-semibold text-foreground whitespace-nowrap">AI Consulting Studio</h1>
            </div>

            <div className="h-5 w-px bg-border hidden sm:block" />

            {/* Project Switcher */}
            <ProjectSwitcher />

            <div className="h-5 w-px bg-border hidden sm:block" />

            {/* Template controls */}
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={activeTemplate} onValueChange={applyTemplate}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={exportTemplate}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Upload className="h-3.5 w-3.5" />
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
            </div>

            {/* Right side controls */}
            <div className="ml-auto flex items-center gap-2">
              <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light"><span className="inline-flex items-center gap-2"><Sun className="h-3.5 w-3.5" /> Light</span></SelectItem>
                  <SelectItem value="dark"><span className="inline-flex items-center gap-2"><Moon className="h-3.5 w-3.5" /> Dark</span></SelectItem>
                  <SelectItem value="comfort"><span className="inline-flex items-center gap-2"><Contrast className="h-3.5 w-3.5" /> Comfort</span></SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
                <Switch id="focus" checked={focusMode} onCheckedChange={setFocusMode} />
                <label htmlFor="focus" className="text-xs text-muted-foreground select-none flex items-center gap-1 cursor-pointer">
                  {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Focus</span>
                </label>
              </div>

              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 py-5 space-y-5">
        {/* ===== Quick Add + Timer + Time Tracker Row ===== */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Quick Add</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="What needs to be done?"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                className="flex-1 min-w-[200px]"
              />
              <Select value={quickPriority} onValueChange={(v) => setQuickPriority(v as Priority)}>
                <SelectTrigger className="h-10 w-[100px] text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 Critical</SelectItem>
                  <SelectItem value="P1">P1 High</SelectItem>
                  <SelectItem value="P2">P2 Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={quickTarget} onValueChange={(v) => setQuickTarget(v as ColumnKey)}>
                <SelectTrigger className="h-10 w-[100px] text-xs">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Now</SelectItem>
                  <SelectItem value="next">Next</SelectItem>
                  <SelectItem value="later">Later</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addTask} className="h-10">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Timer */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Pomodoro</span>
              </div>
              <Badge variant={timer.mode === "focus" ? "default" : "secondary"} className="text-[10px] uppercase">
                {timer.mode}
              </Badge>
            </div>
            <div className="text-3xl font-mono tabular-nums tracking-tight text-foreground mb-2">{timer.display}</div>
            <Progress value={timer.progress} className="mb-3" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {!timer.running ? (
                <Button size="sm" onClick={timer.start} className="h-7 text-xs"><Play className="h-3 w-3 mr-1" />Start</Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={timer.pause} className="h-7 text-xs"><Pause className="h-3 w-3 mr-1" />Pause</Button>
              )}
              <Button size="sm" variant="ghost" onClick={timer.reset} className="h-7 text-xs"><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
              <Select value={String(timer.focusMinutes)} onValueChange={(v) => timer.setFocusMinutes(Number(v) as 25 | 50)}>
                <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25/5</SelectItem>
                  <SelectItem value="50">50/10</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => timer.setMode(timer.mode === "focus" ? "break" : "focus")} className="h-7 text-xs">
                <ArrowRightLeft className="h-3 w-3 mr-1" />Switch
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              Done today: <span className="font-semibold text-foreground">{completedToday}</span>
            </div>
          </div>

          {/* Time Tracker */}
          <TimeTracker
            currentTaskId={selectedTaskId ?? undefined}
            currentProjectId={activeProjectId}
            taskNames={taskNames}
            onOpenReport={() => setTimeReportOpen(true)}
          />
        </div>

        {/* Time Report Dialog */}
        <TimeReport
          open={timeReportOpen}
          onOpenChange={setTimeReportOpen}
          taskNames={taskNames}
        />

        {/* ===== Focus Mode Banner ===== */}
        <AnimatePresence>
          {focusMode && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Focus mode: only the <span className="font-medium text-accent">Now</span> column is visible.
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedTaskId(byCol.now[0]?.id || null)}>
                  Use first task <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== View Toggle ===== */}
        {!focusMode && (
          <div className="flex items-center justify-between">
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
        )}

        {/* ===== Board / Calendar ===== */}
        {!focusMode && viewMode === "calendar" ? (
          <CalendarView
            tasks={tasks}
            onSelectTask={(id) => { setSelectedTaskId(id); setTaskDialogOpen(true); }}
          />
        ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {!focusMode ? (
            <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4">
              {(["now", "next", "later", "backlog", "done"] as ColumnKey[]).map(renderColumn)}
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4">
              <div className="lg:col-span-3 md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      Now
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTask ? (
                      <div className="space-y-4">
                        <div className="text-xl font-semibold tracking-tight text-foreground">{selectedTask.title}</div>
                        {selectedTask.notes ? (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3">{selectedTask.notes}</p>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => { setNotesOpen(true); setNotesDraft(selectedTask.notes || ""); }}>Add notes</Button>
                        )}
                        <div className="flex items-center gap-2">
                          <PriorityBadge p={selectedTask.priority} />
                          {selectedTask.estimate ? <Badge variant="outline">~{selectedTask.estimate} pom</Badge> : null}
                          {(selectedTask.tags ?? []).map(t => (
                            <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                          <Button size="sm" onClick={() => updateTask(selectedTask.id, { completed: true, completedAt: new Date().toISOString(), status: "done" })}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Done
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => moveTask(selectedTask.id, "next")}>Move to Next</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeTask(selectedTask.id)}>Remove</Button>
                          <Button size="sm" variant="outline" onClick={() => selectedTask && generateSubtasksFor(selectedTask)} disabled={subtaskLoading}>
                            <Sparkles className="h-3.5 w-3.5 mr-1" />{subtaskLoading ? "Generating..." : "AI Subtasks"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Select a task from the Now queue to lock focus.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 md:col-span-2 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">Pomodoro</span>
                  </div>
                  <div className="text-5xl font-mono tabular-nums tracking-tight text-foreground">{timer.display}</div>
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
                      <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25/5</SelectItem>
                        <SelectItem value="50">50/10</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => timer.setMode(timer.mode === "focus" ? "break" : "focus")}>
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Switch
                    </Button>
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Now Queue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {byCol.now.length ? (
                      byCol.now.map((t) => (
                        <button
                          key={t.id}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${t.id === selectedTaskId ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"}`}
                          onClick={() => setSelectedTaskId(t.id)}
                        >
                          <div className="flex items-center gap-2">
                            <PriorityBadge p={t.priority} />
                            <span className="truncate">{t.title}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No tasks in Now.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DndContext>
        )}

        {/* ===== Task Detail Dialog ===== */}
        <Dialog
          open={taskDialogOpen}
          onOpenChange={(o) => {
            if (!o && selectedTask) saveTaskEdits();
            setTaskDialogOpen(o);
            if (!o) setSelectedTaskId(null);
          }}
        >
          <DialogContent>
            {selectedTask && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="sr-only">Edit Task</DialogTitle>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-semibold border-none px-0 focus:ring-0 bg-transparent"
                    placeholder="Task title"
                  />
                </DialogHeader>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Priority</label>
                    <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P0"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />P0 Critical</span></SelectItem>
                        <SelectItem value="P1"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />P1 High</span></SelectItem>
                        <SelectItem value="P2"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />P2 Normal</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Estimate</label>
                    <Input
                      type="number"
                      min="0"
                      value={editEstimate}
                      onChange={(e) => setEditEstimate(e.target.value)}
                      placeholder="Pomodoros"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Due Date</label>
                    <Input
                      type="date"
                      value={editDue ? editDue.split("T")[0] : ""}
                      onChange={(e) => setEditDue(e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Tags</label>
                    <Input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Comma-separated"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Assignee</label>
                    <div className="flex items-center gap-2 h-9 px-1">
                      <AssigneePicker
                        assigneeId={selectedTask.assigneeId}
                        onChange={(id) => updateTask(selectedTask.id, { assigneeId: id })}
                        size="md"
                      />
                      <span className="text-xs text-muted-foreground">
                        {selectedTask.assigneeId
                          ? assigneeLabel(selectedTask.assigneeId)
                          : "Unassigned"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Notes</label>
                  {selectedTask.notes ? (
                    <div
                      className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => { setNotesOpen(true); setNotesDraft(selectedTask.notes || ""); }}
                    >
                      {selectedTask.notes}
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { setNotesOpen(true); setNotesDraft(""); }}>
                      Click to add notes...
                    </Button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    onClick={() => {
                      saveTaskEdits();
                      updateTask(selectedTask.id, { completed: true, completedAt: new Date().toISOString(), status: "done" });
                      setTaskDialogOpen(false);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
                  </Button>
                  <Select onValueChange={(v) => { saveTaskEdits(); moveTask(selectedTask.id, v as ColumnKey); }}>
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue placeholder="Move to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Now</SelectItem>
                      <SelectItem value="next">Next</SelectItem>
                      <SelectItem value="later">Later</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => { saveTaskEdits(); selectedTask && generateSubtasksFor(selectedTask); }} disabled={subtaskLoading}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />{subtaskLoading ? "..." : "AI Subtasks"}
                  </Button>
                  <div className="ml-auto">
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => { if (confirm("Delete this task?")) removeTask(selectedTask.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ===== Notes Editor Dialog ===== */}
        <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notes</DialogTitle>
            </DialogHeader>
            <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} className="min-h-[200px]" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNotesOpen(false)}>Cancel</Button>
              <Button onClick={() => { if (selectedTask) updateTask(selectedTask.id, { notes: notesDraft }); setNotesOpen(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Help Dialog ===== */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI Consulting Studio</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Your local task manager for AI consulting work. Manage client engagements, track deliverables, plan workshops, and stay focused.</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2"><Plus className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span><strong>Quick Add</strong> — type a task, pick priority & column, press Enter.</span></div>
                <div className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span><strong>Move tasks</strong> — hover a card to reveal actions, or drag & drop.</span></div>
                <div className="flex items-start gap-2"><Eye className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span><strong>Focus mode</strong> — shows only Now with an enlarged active task and timer.</span></div>
                <div className="flex items-start gap-2"><LayoutGrid className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span><strong>Templates</strong> — apply presets, export/import as JSON.</span></div>
                <div className="flex items-start gap-2"><Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span><strong>AI Subtasks</strong> — break a task into actionable steps (needs API key).</span></div>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { if (confirm("Clear all tasks?")) { setTasks([]); setHelpOpen(false); } }}>Clear All Tasks</Button>
                  <Button variant="secondary" size="sm" onClick={() => { applyTemplate("Blank"); setHelpOpen(false); }}>Reset to Blank</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/60">All data stored locally in your browser.</p>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* ===== Footer ===== */}
      <footer className="max-w-[1440px] mx-auto px-4 py-6">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{stats.completed}/{stats.total} tasks</span>
          <div className="flex-1 max-w-[200px]">
            <Progress value={progressPct} />
          </div>
          <span>{progressPct}% complete</span>
          {completedToday > 0 && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span>{completedToday} done today</span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
