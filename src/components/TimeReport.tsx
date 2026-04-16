import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTimeTracking } from "@/lib/timeContext";
import {
  formatDuration,
  getEntriesInRange,
  groupByTask,
  groupByProject,
  entriesToCSV,
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
} from "@/lib/timeUtils";
import { Download, Clock, FolderOpen, ListTodo, ArrowUpDown } from "lucide-react";

type DateRange = "today" | "week" | "month";
type SortField = "name" | "time";
type SortDir = "asc" | "desc";

interface TimeReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Map of taskId -> task title */
  taskNames?: Map<string, string>;
}

export default function TimeReport({
  open,
  onOpenChange,
  taskNames,
}: TimeReportProps) {
  const { entries } = useTimeTracking();
  const [range, setRange] = useState<DateRange>("today");
  const [taskSort, setTaskSort] = useState<SortField>("time");
  const [taskSortDir, setTaskSortDir] = useState<SortDir>("desc");

  // Compute date bounds
  const { start, end } = useMemo(() => {
    const now = new Date();
    switch (range) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now), end: endOfDay(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfDay(now) };
    }
  }, [range]);

  // Filtered entries
  const filtered = useMemo(
    () => getEntriesInRange(entries, start, end),
    [entries, start, end],
  );

  // Group by project
  const projectData = useMemo(() => {
    const map = groupByProject(filtered);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Group by task
  const taskData = useMemo(() => {
    const map = groupByTask(filtered);
    const arr = Array.from(map.entries()).map(([id, mins]) => ({
      id,
      name: taskNames?.get(id) ?? id,
      minutes: mins,
    }));

    arr.sort((a, b) => {
      const cmp =
        taskSort === "time"
          ? a.minutes - b.minutes
          : a.name.localeCompare(b.name);
      return taskSortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [filtered, taskNames, taskSort, taskSortDir]);

  // Totals
  const totalMinutes = useMemo(
    () => filtered.reduce((sum, e) => sum + e.duration, 0),
    [filtered],
  );

  const maxProjectMinutes = useMemo(
    () => (projectData.length > 0 ? projectData[0][1] : 0),
    [projectData],
  );

  // CSV export
  const handleExport = () => {
    const nameMap = taskNames ?? new Map<string, string>();
    const csv = entriesToCSV(filtered, nameMap);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleTaskSort = (field: SortField) => {
    if (taskSort === field) {
      setTaskSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTaskSort(field);
      setTaskSortDir("desc");
    }
  };

  const rangeLabel: Record<DateRange, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Time Report
          </DialogTitle>
        </DialogHeader>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {formatDuration(totalMinutes)} total
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No time entries for {rangeLabel[range].toLowerCase()}.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Project breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  By Project
                </span>
              </div>
              <div className="space-y-2">
                {projectData.map(([projectId, mins]) => {
                  const pct =
                    maxProjectMinutes > 0
                      ? Math.round((mins / maxProjectMinutes) * 100)
                      : 0;
                  return (
                    <div key={projectId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground font-medium truncate">
                          {projectId}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatDuration(mins)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  By Task
                </span>
              </div>
              {/* Sort controls */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <button
                  className={`flex items-center gap-0.5 hover:text-foreground transition-colors ${taskSort === "name" ? "text-foreground font-medium" : ""}`}
                  onClick={() => toggleTaskSort("name")}
                >
                  Name
                  {taskSort === "name" && (
                    <ArrowUpDown className="h-2.5 w-2.5" />
                  )}
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  className={`flex items-center gap-0.5 hover:text-foreground transition-colors ${taskSort === "time" ? "text-foreground font-medium" : ""}`}
                  onClick={() => toggleTaskSort("time")}
                >
                  Time
                  {taskSort === "time" && (
                    <ArrowUpDown className="h-2.5 w-2.5" />
                  )}
                </button>
              </div>
              {/* Task list */}
              <div className="space-y-1">
                {taskData.map((item) => {
                  const pct =
                    totalMinutes > 0
                      ? Math.round((item.minutes / totalMinutes) * 100)
                      : 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs text-foreground truncate flex-1 min-w-0">
                        {item.name}
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full bg-accent/70 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground w-12 text-right flex-shrink-0">
                        {formatDuration(item.minutes)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 w-8 text-right flex-shrink-0">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary footer */}
            <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"}{" "}
                in range
              </span>
              <span className="font-mono font-medium text-foreground">
                {formatDuration(totalMinutes)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
