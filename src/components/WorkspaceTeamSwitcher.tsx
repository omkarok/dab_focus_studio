// ============================================================
// WorkspaceTeamSwitcher — header switcher for the active
// workspace and team. Sits next to ProjectSwitcher in the
// app header. Lets the user switch workspaces, switch teams
// inside the current workspace, and create a new team.
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Users, Plus, Check, ChevronDown } from "lucide-react";
import { useWorkspace } from "@/lib/workspaceContext";

export default function WorkspaceTeamSwitcher() {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    teams,
    currentTeam,
    setCurrentTeam,
    createTeam,
    createWorkspace,
    isAdmin,
  } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewTeam(false);
        setShowNewWorkspace(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const team = await createTeam(newTeamName.trim());
      setCurrentTeam(team.id);
    } catch (e) {
      console.error("Failed to create team:", e);
    }
    setNewTeamName("");
    setShowNewTeam(false);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      await createWorkspace(newWorkspaceName.trim());
    } catch (e) {
      console.error("Failed to create workspace:", e);
    }
    setNewWorkspaceName("");
    setShowNewWorkspace(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-2.5 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors text-sm"
      >
        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground truncate max-w-[140px]">
          {currentWorkspace?.name ?? "No workspace"}
        </span>
        {currentTeam && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground truncate max-w-[100px]">{currentTeam.name}</span>
          </>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[320px] rounded-xl border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Workspaces section */}
          <div className="px-3 py-2 border-b border-border">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building className="h-3 w-3" />
                Workspaces
              </span>
              <button
                type="button"
                className="text-accent hover:underline text-[10px] font-normal normal-case tracking-normal"
                onClick={() => setShowNewWorkspace(!showNewWorkspace)}
              >
                {showNewWorkspace ? "Cancel" : "+ New"}
              </button>
            </div>

            {showNewWorkspace && (
              <div className="flex gap-1.5 mb-2">
                <Input
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCreateWorkspace}>
                  Create
                </Button>
              </div>
            )}

            <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setCurrentWorkspace(w.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                    w.id === currentWorkspace?.id ? "bg-accent/10 text-accent" : "hover:bg-muted"
                  }`}
                >
                  <Building className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{w.name}</span>
                  {w.id === currentWorkspace?.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Teams section */}
          {currentWorkspace && (
            <div className="px-3 py-2">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Teams in {currentWorkspace.name}
                </span>
                <button
                  type="button"
                  className="text-accent hover:underline text-[10px] font-normal normal-case tracking-normal"
                  onClick={() => setShowNewTeam(!showNewTeam)}
                >
                  {showNewTeam ? "Cancel" : "+ New"}
                </button>
              </div>

              {showNewTeam && (
                <div className="flex gap-1.5 mb-2">
                  <Input
                    placeholder="Team name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCreateTeam}>
                    Create
                  </Button>
                </div>
              )}

              <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                {teams.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No teams yet. {isAdmin ? "Create one above." : "Ask an admin to create one."}
                  </div>
                ) : (
                  teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setCurrentTeam(t.id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                        t.id === currentTeam?.id ? "bg-accent/10 text-accent" : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.color ?? "#6366f1" }}
                      />
                      <span className="truncate flex-1">{t.name}</span>
                      {t.id === currentTeam?.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
