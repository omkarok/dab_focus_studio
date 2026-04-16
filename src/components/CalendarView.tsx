import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { Task, Priority } from "@/FocusStudioStarter";
import {
  getWeekDays,
  isToday,
  isPast,
  formatDayHeader,
  groupTasksByDate,
  toDateKey,
} from "@/lib/calendarUtils";

export interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

const PRIORITY_DOT_COLORS: Record<Priority, string> = {
  P0: "bg-red-500",
  P1: "bg-amber-500",
  P2: "bg-emerald-500",
};

const PRIORITY_BORDER_COLORS: Record<Priority, string> = {
  P0: "border-l-red-500",
  P1: "border-l-amber-500",
  P2: "border-l-emerald-500",
};

const STATUS_LABELS: Record<string, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  backlog: "Backlog",
  done: "Done",
};

function TaskPill({
  task,
  isOverdue,
  onClick,
}: {
  task: Task;
  isOverdue: boolean;
  onClick: () => void;
}) {
  const borderColor = isOverdue
    ? "border-l-red-500"
    : PRIORITY_BORDER_COLORS[task.priority];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border border-border border-l-[3px] ${borderColor} bg-card px-2.5 py-1.5 transition-colors hover:bg-muted/70 group`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isOverdue && (
          <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
        )}
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${PRIORITY_DOT_COLORS[task.priority]}`}
        />
        <span
          className={`text-xs truncate flex-1 ${
            task.completed
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 ml-[18px]">
        <span className="text-[10px] text-muted-foreground">
          {STATUS_LABELS[task.status] ?? task.status}
        </span>
        {task.estimate ? (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {task.estimate}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function CalendarView({
  tasks,
  onSelectTask,
}: CalendarViewProps) {
  const [referenceDate, setReferenceDate] = useState(() => new Date());

  const weekDays = useMemo(() => getWeekDays(referenceDate), [referenceDate]);

  const grouped = useMemo(
    () => groupTasksByDate(tasks, weekDays),
    [tasks, weekDays]
  );

  const overdueSet = useMemo(() => {
    const set = new Set<string>();
    for (const task of tasks) {
      if (task.due && !task.completed && isPast(new Date(task.due))) {
        set.add(task.id);
      }
    }
    return set;
  }, [tasks]);

  const unscheduled = grouped.get("unscheduled") ?? [];

  const navigateWeek = (delta: number) => {
    setReferenceDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  };

  const goToThisWeek = () => {
    setReferenceDate(new Date());
  };

  // Format month/year label for the header
  const headerLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    if (first.getMonth() === last.getMonth()) {
      return `${monthNames[first.getMonth()]} ${first.getFullYear()}`;
    }
    if (first.getFullYear() === last.getFullYear()) {
      return `${monthNames[first.getMonth()]} – ${monthNames[last.getMonth()]} ${first.getFullYear()}`;
    }
    return `${monthNames[first.getMonth()]} ${first.getFullYear()} – ${monthNames[last.getMonth()]} ${last.getFullYear()}`;
  }, [weekDays]);

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">
            {headerLabel}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => navigateWeek(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={goToThisWeek}
          >
            This Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => navigateWeek(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Week grid + unscheduled sidebar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={toDateKey(weekDays[0])}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex gap-3"
        >
          {/* 7-day grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const dayTasks = grouped.get(key) ?? [];
              const today = isToday(day);
              const past = isPast(day);

              return (
                <div
                  key={key}
                  className={`rounded-xl border min-h-[140px] flex flex-col ${
                    today
                      ? "border-accent bg-accent/5"
                      : "border-border bg-card/50"
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`px-2.5 py-1.5 border-b text-center ${
                      today
                        ? "border-accent/30 bg-accent/10"
                        : "border-border"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        today
                          ? "text-accent"
                          : past
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {formatDayHeader(day)}
                    </span>
                    {today && (
                      <span className="ml-1.5 text-[10px] text-accent font-medium">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Task list */}
                  <div className="flex-1 p-1.5 space-y-1">
                    {dayTasks.length > 0 ? (
                      dayTasks.map((task) => (
                        <TaskPill
                          key={task.id}
                          task={task}
                          isOverdue={overdueSet.has(task.id)}
                          onClick={() => onSelectTask(task.id)}
                        />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full min-h-[60px]">
                        <span className="text-[10px] text-muted-foreground/50 italic">
                          No tasks
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unscheduled sidebar */}
          <div className="w-[200px] shrink-0 hidden lg:block">
            <div className="rounded-xl border border-dashed border-border bg-card/30 min-h-[140px] flex flex-col">
              <div className="px-2.5 py-1.5 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  Unscheduled
                </span>
                <Badge variant="secondary" className="ml-1.5 text-[10px]">
                  {unscheduled.length}
                </Badge>
              </div>
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[500px]">
                {unscheduled.length > 0 ? (
                  unscheduled.map((task) => (
                    <TaskPill
                      key={task.id}
                      task={task}
                      isOverdue={false}
                      onClick={() => onSelectTask(task.id)}
                    />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[60px]">
                    <span className="text-[10px] text-muted-foreground/50 italic">
                      All tasks have dates
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Mobile: Unscheduled section shown below the grid */}
      {unscheduled.length > 0 && (
        <div className="lg:hidden">
          <div className="rounded-xl border border-dashed border-border bg-card/30">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Unscheduled
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {unscheduled.length}
              </Badge>
            </div>
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {unscheduled.map((task) => (
                <TaskPill
                  key={task.id}
                  task={task}
                  isOverdue={false}
                  onClick={() => onSelectTask(task.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
