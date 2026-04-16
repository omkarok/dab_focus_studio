import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimeTracking } from "@/lib/timeContext";
import { formatDuration, formatDurationShort, groupByTask } from "@/lib/timeUtils";
import { Clock, Play, Square, BarChart3 } from "lucide-react";

interface TimeTrackerProps {
  /** The currently selected task ID — used for the "Start" action */
  currentTaskId?: string;
  /** The project ID to associate with tracked time */
  currentProjectId?: string;
  /** Map of taskId -> task title, for display purposes */
  taskNames?: Map<string, string>;
  /** Callback when the report button is clicked */
  onOpenReport?: () => void;
}

export default function TimeTracker({
  currentTaskId,
  currentProjectId = "default",
  taskNames,
  onOpenReport,
}: TimeTrackerProps) {
  const {
    activeEntry,
    elapsedMinutes,
    startTracking,
    stopTracking,
    getTodayTotal,
    getTodayEntries,
  } = useTimeTracking();

  const todayTotal = getTodayTotal();
  const todayEntries = getTodayEntries();

  // Top 5 tasks by time tracked today
  const todayByTask = useMemo(() => {
    const completedToday = todayEntries.filter((e) => e.endedAt);
    const grouped = groupByTask(completedToday);

    // If there is a running entry, add its live elapsed
    if (activeEntry) {
      const prev = grouped.get(activeEntry.taskId) ?? 0;
      grouped.set(activeEntry.taskId, prev + elapsedMinutes);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [todayEntries, activeEntry, elapsedMinutes]);

  const isTracking = !!activeEntry;

  const handleToggle = () => {
    if (isTracking) {
      stopTracking();
    } else if (currentTaskId) {
      startTracking(currentTaskId, currentProjectId);
    }
  };

  const activeTaskName = useMemo(() => {
    if (!activeEntry) return null;
    return taskNames?.get(activeEntry.taskId) ?? activeEntry.taskId;
  }, [activeEntry, taskNames]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              Time Tracker
            </span>
          </div>
          {onOpenReport && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onOpenReport}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Report
            </Button>
          )}
        </div>

        {/* Active timer */}
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          {isTracking ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Pulsing dot */}
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {activeTaskName}
                </span>
              </div>
              <div className="text-2xl font-mono tabular-nums tracking-tight text-foreground">
                {formatDurationShort(elapsedMinutes)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-1">
              No timer running
            </div>
          )}
        </div>

        {/* Start / Stop button */}
        <div className="flex items-center gap-2">
          {isTracking ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs flex-1"
              onClick={handleToggle}
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={handleToggle}
              disabled={!currentTaskId}
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
        </div>

        {/* Today's total */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Today</span>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {formatDuration(todayTotal)}
          </Badge>
        </div>

        {/* Mini breakdown: top 5 tasks today */}
        {todayByTask.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Today&apos;s breakdown
            </span>
            {todayByTask.map(([taskId, mins]) => {
              const name = taskNames?.get(taskId) ?? taskId;
              const pct =
                todayTotal > 0 ? Math.round((mins / todayTotal) * 100) : 0;
              return (
                <div key={taskId} className="flex items-center gap-2">
                  <span className="text-xs text-foreground truncate flex-1 min-w-0">
                    {name}
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground w-10 text-right flex-shrink-0">
                    {formatDuration(mins)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
