import React, { useState, useRef, useEffect } from "react";
import { FolderOpen, Plus, Archive, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProjects, type Project } from "@/lib/projectContext";

const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#64748b", // slate
];

export default function ProjectSwitcher() {
  const {
    projects,
    activeProject,
    setActiveProject,
    addProject,
    archiveProject,
    getTaskCountForProject,
  } = useProjects();

  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [showArchived, setShowArchived] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const handleAddProject = () => {
    if (!newName.trim()) return;
    const created = addProject({
      name: newName.trim(),
      client: newClient.trim() || "Unknown",
      color: newColor,
    });
    setActiveProject(created.id);
    setNewName("");
    setNewClient("");
    setNewColor(PROJECT_COLORS[0]);
    setShowNewForm(false);
    setOpen(false);
  };

  const handleSelectProject = (id: string) => {
    setActiveProject(id);
    setOpen(false);
    setShowNewForm(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-2.5 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors text-sm"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: activeProject.color }}
        />
        <span className="font-medium text-foreground truncate max-w-[120px]">
          {activeProject.name}
        </span>
        {activeProject.client !== "Personal" && (
          <span className="text-muted-foreground text-xs truncate max-w-[80px] hidden sm:inline">
            {activeProject.client}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[300px] rounded-xl border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <FolderOpen className="h-3 w-3" />
              Projects
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setShowNewForm(!showNewForm)}
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>

          {/* New Project Form */}
          {showNewForm && (
            <div className="px-3 py-2.5 border-b border-border space-y-2 bg-muted/30">
              <Input
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddProject(); }}
                className="h-8 text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Client company"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddProject(); }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {/* Color picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Color</span>
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newColor === c ? "var(--foreground)" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <Button size="sm" className="h-7 px-3 text-xs" onClick={handleAddProject}>
                  Create Project
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Project list */}
          <div className="max-h-[280px] overflow-y-auto py-1">
            {activeProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                isActive={project.id === activeProject.id}
                taskCount={getTaskCountForProject(project.id)}
                onSelect={() => handleSelectProject(project.id)}
                onArchive={
                  project.id !== "default"
                    ? () => archiveProject(project.id)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Archived section */}
          {archivedProjects.length > 0 && (
            <div className="border-t border-border">
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="w-full px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:bg-muted/50 transition-colors"
              >
                <Archive className="h-3 w-3" />
                Archived ({archivedProjects.length})
                <ChevronDown
                  className={`h-3 w-3 ml-auto transition-transform ${showArchived ? "rotate-180" : ""}`}
                />
              </button>
              {showArchived && (
                <div className="pb-1">
                  {archivedProjects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isActive={false}
                      taskCount={getTaskCountForProject(project.id)}
                      onSelect={() => handleSelectProject(project.id)}
                      archived
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  isActive,
  taskCount,
  onSelect,
  onArchive,
  archived,
}: {
  project: Project;
  isActive: boolean;
  taskCount: number;
  onSelect: () => void;
  onArchive?: () => void;
  archived?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-accent/10 text-accent"
          : "hover:bg-muted text-foreground"
      } ${archived ? "opacity-60" : ""}`}
      onClick={onSelect}
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: project.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm truncate ${isActive ? "font-medium" : ""}`}>
            {project.name}
          </span>
          {isActive && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Building2 className="h-2.5 w-2.5" />
          <span className="truncate">{project.client}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {onArchive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-all"
          title="Archive project"
        >
          <Archive className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
