import { useMemo, useState } from "react";
import FocusStudioStarter from "./FocusStudioStarter";
import PlannerBar from "./features/dailyPlanner/PlannerBar";
import { TaskProvider, useTasks } from "@/lib/taskContext";
import { TemplateProvider } from "@/lib/templateContext";
import { ProjectProvider, useProjects } from "@/lib/projectContext";
import { TimeProvider } from "@/lib/timeContext";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspaceContext";
import { EngagementProvider, useEngagements } from "@/consultingOS/engagementContext";
import { computeNudges } from "@/consultingOS/nudges";
import ConsultingOSView, { type OsTab } from "@/consultingOS/ConsultingOSView";
import { AuthGate } from "@/components/AuthGate";
import WorkspaceTeamSwitcher from "@/components/WorkspaceTeamSwitcher";
import { MembersPanel } from "@/components/MembersPanel";
import { MyWorkView } from "@/components/MyWorkView";
import { TeamTaskView } from "@/components/TeamTaskView";
import { CreateFirstProject } from "@/components/CreateFirstProject";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Inbox, Users, Activity, LogOut, Workflow, BellRing } from "lucide-react";

type View = "board" | "team" | "my-work" | "os" | "members";

function AppShell() {
  const { user, signOut } = useAuth();
  const { currentWorkspace, profiles: wsProfiles } = useWorkspace();
  const { setActiveProject, activeProjectId, projects, loading: projectsLoading } = useProjects();
  const { profiles: engagementProfiles } = useEngagements();
  const { tasks } = useTasks();
  const [view, setView] = useState<View>("board");
  const [osTab, setOsTab] = useState<OsTab>("direction");

  const handleOpenTaskFromTeam = (projectId: string, _taskId: string) => {
    setActiveProject(projectId);
    setView("board");
  };

  const openBoard = (projectId: string) => {
    setActiveProject(projectId);
    setView("board");
  };

  // Lightweight nudge count for the header bell — reuses the OS scheduler.
  const nudges = useMemo(
    () =>
      computeNudges({
        profiles: engagementProfiles,
        projectMeta: Object.fromEntries(
          projects.map((p) => [p.id, { name: p.name, client: p.client, ownerId: p.ownerId }]),
        ),
        ownerLabel: (id) =>
          id ? wsProfiles[id]?.name ?? wsProfiles[id]?.email ?? "Owner" : "Unassigned",
        activeProjectId,
        activeTasks: tasks,
      }),
    [engagementProfiles, projects, wsProfiles, activeProjectId, tasks],
  );
  const actionableNudges = nudges.filter(
    (n) => n.severity === "breach" || n.severity === "overdue",
  ).length;

  // When in shared-workspace mode but no real projects exist, block the
  // board and team views and force project creation. Otherwise the app
  // silently falls back to a localStorage "default" project and tasks
  // never reach teammates.
  const needsFirstProject =
    isSupabaseConfigured() &&
    !!currentWorkspace &&
    !projectsLoading &&
    projects.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-3 sm:px-4 h-12 flex items-center gap-2">
          <WorkspaceTeamSwitcher />
          <div className="flex-1" />
          <nav className="flex items-center gap-1">
            <ViewTab active={view === "board"} onClick={() => setView("board")} icon={<LayoutGrid className="h-3.5 w-3.5" />}>
              Board
            </ViewTab>
            <ViewTab active={view === "team"} onClick={() => setView("team")} icon={<Activity className="h-3.5 w-3.5" />}>
              Team
            </ViewTab>
            <ViewTab active={view === "my-work"} onClick={() => setView("my-work")} icon={<Inbox className="h-3.5 w-3.5" />}>
              My Work
            </ViewTab>
            <ViewTab active={view === "os"} onClick={() => setView("os")} icon={<Workflow className="h-3.5 w-3.5" />}>
              OS
            </ViewTab>
            <ViewTab active={view === "members"} onClick={() => setView("members")} icon={<Users className="h-3.5 w-3.5" />}>
              Members
            </ViewTab>
          </nav>
          <div className="flex items-center gap-2 pl-2 border-l border-border ml-2">
            <button
              type="button"
              title="Nudges — next expected actions"
              onClick={() => {
                setView("os");
                setOsTab("nudges");
              }}
              className="relative h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <BellRing className="h-4 w-4" />
              {actionableNudges > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-medium">
                  {actionableNudges}
                </span>
              )}
            </button>
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[160px]">
              {user?.name ?? user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => void signOut()}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      {view === "board" && (
        <>
          {!currentWorkspace ? (
            <div className="p-6 text-sm text-muted-foreground">No workspace selected.</div>
          ) : needsFirstProject ? (
            <CreateFirstProject />
          ) : (
            <>
              <FocusStudioStarter />
              <PlannerBar />
            </>
          )}
        </>
      )}

      {view === "team" && (
        <>
          {!currentWorkspace ? (
            <div className="p-6 text-sm text-muted-foreground">No workspace selected.</div>
          ) : needsFirstProject ? (
            <CreateFirstProject />
          ) : (
            <TeamTaskView onOpenTask={handleOpenTaskFromTeam} />
          )}
        </>
      )}

      {view === "my-work" && <MyWorkView />}

      {view === "os" && (
        <>
          {!currentWorkspace ? (
            <div className="p-6 text-sm text-muted-foreground">No workspace selected.</div>
          ) : needsFirstProject ? (
            <CreateFirstProject />
          ) : (
            <ConsultingOSView
              tab={osTab}
              onTabChange={setOsTab}
              onOpenBoard={openBoard}
              nudgeCount={actionableNudges}
            />
          )}
        </>
      )}

      {view === "members" && (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <MembersPanel />
        </div>
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <WorkspaceProvider>
          <ProjectProvider>
            <EngagementProvider>
              <TemplateProvider>
                <TaskProvider>
                  <TimeProvider>
                    <AppShell />
                  </TimeProvider>
                </TaskProvider>
              </TemplateProvider>
            </EngagementProvider>
          </ProjectProvider>
        </WorkspaceProvider>
      </AuthGate>
    </AuthProvider>
  );
}
