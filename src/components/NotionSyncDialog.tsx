import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  CalendarClock,
  ExternalLink,
  Check,
  AlertCircle,
  Copy,
} from "lucide-react";
import type { Task } from "@/FocusStudioStarter";
import { tasksToICS, schedulableTasks } from "@/lib/calendarSync";
import {
  tasksToJSON,
  tasksToCSV,
  parseTasks,
  mergeTasks,
  downloadFile,
  type MergeMode,
} from "@/lib/taskIO";

export interface NotionSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  projectName: string;
  onImport: (tasks: Task[]) => void;
}

const NOTION_CALENDAR_URL = "https://calendar.notion.so";

function safeSlug(name: string): string {
  return (name || "tasks")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "tasks";
}

export default function NotionSyncDialog({
  open,
  onOpenChange,
  tasks,
  projectName,
  onImport,
}: NotionSyncDialogProps) {
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [importText, setImportText] = useState("");
  const [mergeMode, setMergeMode] = useState<MergeMode>("merge");
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = safeSlug(projectName);
  const scheduledCount = useMemo(
    () => schedulableTasks(tasks, includeCompleted).length,
    [tasks, includeCompleted],
  );

  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleDownloadIcs = () => {
    const ics = tasksToICS(tasks, {
      calendarName: `AI Consulting Studio — ${projectName}`,
      includeCompleted,
    });
    downloadFile(`${slug}-calendar-${stamp()}.ics`, ics, "text/calendar;charset=utf-8");
  };

  const handleDownloadJson = () => {
    downloadFile(`${slug}-tasks-${stamp()}.json`, tasksToJSON(tasks), "application/json");
  };

  const handleDownloadCsv = () => {
    downloadFile(`${slug}-tasks-${stamp()}.csv`, tasksToCSV(tasks), "text/csv;charset=utf-8");
  };

  const handleCopyIcs = async () => {
    try {
      const ics = tasksToICS(tasks, {
        calendarName: `AI Consulting Studio — ${projectName}`,
        includeCompleted,
      });
      await navigator.clipboard.writeText(ics);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setImportMsg({ kind: "err", text: "Clipboard is unavailable — use Download .ics instead." });
    }
  };

  const runImport = (text: string) => {
    if (!text.trim()) {
      setImportMsg({ kind: "err", text: "Nothing to import — paste JSON/CSV or choose a file." });
      return;
    }
    try {
      const { tasks: parsed, format } = parseTasks(text);
      if (parsed.length === 0) {
        setImportMsg({
          kind: "err",
          text: `No tasks found in the ${format.toUpperCase()}. Check the columns/format and try again.`,
        });
        return;
      }
      const result = mergeTasks(tasks, parsed, mergeMode);
      onImport(result.tasks);
      const detail =
        mergeMode === "replace"
          ? `Replaced the board with ${result.added} task${result.added === 1 ? "" : "s"}.`
          : `Added ${result.added} task${result.added === 1 ? "" : "s"}` +
            (result.skipped ? `, skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.` : ".");
      setImportMsg({ kind: "ok", text: `Imported from ${format.toUpperCase()}. ${detail}` });
      setImportText("");
    } catch (e: any) {
      setImportMsg({ kind: "err", text: `Import failed: ${e?.message ?? "invalid file"}.` });
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      runImport(text);
    } catch {
      setImportMsg({ kind: "err", text: "Could not read that file." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            Calendar Sync &amp; Import / Export
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="notion">
          <TabsList>
            <TabsTrigger value="notion">Notion Calendar</TabsTrigger>
            <TabsTrigger value="io">Import / Export</TabsTrigger>
          </TabsList>

          {/* ===== Notion Calendar tab ===== */}
          <TabsContent value="notion" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Notion Calendar subscribes to standard calendar feeds. Export your
              scheduled tasks as an <span className="font-medium text-foreground">.ics</span> file,
              then add it in Notion Calendar (or Google Calendar, which Notion
              Calendar reads) so every task with a due date shows up on your calendar.
            </p>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <label htmlFor="inc-completed" className="text-sm text-foreground flex items-center gap-2 cursor-pointer">
                <Switch
                  id="inc-completed"
                  checked={includeCompleted}
                  onCheckedChange={setIncludeCompleted}
                />
                Include completed tasks
              </label>
              <span className="text-xs text-muted-foreground">
                {scheduledCount} scheduled task{scheduledCount === 1 ? "" : "s"}
              </span>
            </div>

            {scheduledCount === 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  No tasks have a due date yet. Add due dates to tasks (in the task
                  editor) so they appear on the calendar.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleDownloadIcs} disabled={scheduledCount === 0}>
                <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                Download .ics
              </Button>
              <Button size="sm" variant="secondary" onClick={handleCopyIcs} disabled={scheduledCount === 0}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? "Copied" : "Copy .ics"}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadCsv}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                Notion CSV
              </Button>
              <a href={NOTION_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open Notion Calendar
                </Button>
              </a>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-3">
              <p className="text-xs font-semibold text-foreground mb-1.5">
                How to add it to Notion Calendar
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download the <span className="font-medium text-foreground">.ics</span> file above.</li>
                <li>
                  In Google Calendar, choose <span className="font-medium text-foreground">Settings → Import &amp; export → Import</span> and
                  upload the file.
                </li>
                <li>
                  Open <span className="font-medium text-foreground">Notion Calendar</span> — the events appear automatically
                  since it syncs your Google calendars.
                </li>
                <li>
                  Prefer a Notion database? Use <span className="font-medium text-foreground">Notion CSV</span>, import it into a
                  database, then switch it to a <span className="font-medium text-foreground">Calendar</span> view on the Due date.
                </li>
              </ol>
            </div>
          </TabsContent>

          {/* ===== Import / Export tab ===== */}
          <TabsContent value="io" className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Export {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={handleDownloadJson}>
                  <FileJson className="h-3.5 w-3.5 mr-1.5" />
                  JSON
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadCsv}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                  CSV
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadIcs} disabled={scheduledCount === 0}>
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                  iCal (.ics)
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Import
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Paste JSON or CSV, or choose a file. Notion database CSV exports are
                supported — the format is detected automatically.
              </p>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'Paste JSON or CSV here…\ne.g. Name,Status,Priority,Due,Tags,Estimate,Notes,Completed'}
                className="min-h-[120px] font-mono text-xs"
              />

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMergeMode("merge")}
                    className={`h-7 px-3 text-xs rounded-md transition-colors ${
                      mergeMode === "merge"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode("replace")}
                    className={`h-7 px-3 text-xs rounded-md transition-colors ${
                      mergeMode === "replace"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Replace
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.txt,application/json,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    void handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Choose file…
                </Button>

                <Button size="sm" className="ml-auto" onClick={() => runImport(importText)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Import tasks
                </Button>
              </div>

              {mergeMode === "replace" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 mt-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Replace overwrites all current tasks in this project with the imported ones.</span>
                </div>
              )}

              {importMsg && (
                <div
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs mt-2 border ${
                    importMsg.kind === "ok"
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                      : "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
                  }`}
                >
                  {importMsg.kind === "ok" ? (
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>{importMsg.text}</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
