// ============================================================
// Workspace context — top-level tenant scope for the app.
// Manages workspaces, teams, members, profiles, and invitations.
// Mounted only after the user is authenticated and has at least
// one workspace membership (or just created one via bootstrap).
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, db } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  Team,
  TeamMember,
  Profile,
  Invitation,
} from "@/lib/types";

const ACTIVE_WORKSPACE_KEY = "acs_active_workspace_v1";
const ACTIVE_TEAM_KEY = "acs_active_team_v1";

// ---- DB row mappings ----

function mapWorkspace(r: any): Workspace {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}
function mapMember(r: any): WorkspaceMember {
  return {
    workspaceId: r.workspace_id,
    userId: r.user_id,
    role: r.role,
    joinedAt: r.joined_at,
  };
}
function mapTeam(r: any): Team {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
  };
}
function mapTeamMember(r: any): TeamMember {
  return {
    teamId: r.team_id,
    userId: r.user_id,
    role: r.role,
    joinedAt: r.joined_at,
  };
}
function mapProfile(r: any): Profile {
  return {
    id: r.id,
    email: r.email,
    name: r.name ?? undefined,
    avatarUrl: r.avatar_url ?? undefined,
    createdAt: r.created_at,
  };
}
function mapInvitation(r: any): Invitation {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    email: r.email,
    role: r.role,
    teamIds: r.team_ids ?? [],
    invitedBy: r.invited_by ?? undefined,
    acceptedAt: r.accepted_at ?? undefined,
    acceptedBy: r.accepted_by ?? undefined,
    createdAt: r.created_at,
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

export type WorkspaceContextValue = {
  loading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (id: string) => void;

  teams: Team[]; // teams in current workspace
  currentTeam: Team | null;
  setCurrentTeam: (id: string) => void;

  members: WorkspaceMember[]; // for current workspace
  teamMembers: TeamMember[]; // for current workspace's teams
  profiles: Record<string, Profile>; // profileId → profile
  invitations: Invitation[]; // pending invites for current workspace

  myRole: WorkspaceRole | null;
  isAdmin: boolean;

  refresh: () => Promise<void>;

  createWorkspace: (name: string) => Promise<Workspace>;
  createTeam: (name: string, description?: string) => Promise<Team>;
  inviteMember: (email: string, role: WorkspaceRole, teamIds?: string[]) => Promise<Invitation>;
  updateMemberRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  addUserToTeam: (teamId: string, userId: string) => Promise<void>;
  removeUserFromTeam: (teamId: string, userId: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Hydrate persisted selections
  useEffect(() => {
    try {
      const w = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const t = localStorage.getItem(ACTIVE_TEAM_KEY);
      if (w) setCurrentWorkspaceId(JSON.parse(w));
      if (t) setCurrentTeamId(JSON.parse(t));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      try {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, JSON.stringify(currentWorkspaceId));
      } catch {
        /* ignore */
      }
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (currentTeamId) {
      try {
        localStorage.setItem(ACTIVE_TEAM_KEY, JSON.stringify(currentTeamId));
      } catch {
        /* ignore */
      }
    }
  }, [currentTeamId]);

  // Load workspaces the user belongs to
  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    const { data, error } = await db
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    const ws = (data ?? []).map(mapWorkspace);
    setWorkspaces(ws);

    // Auto-select first workspace if none selected or selection is invalid
    setCurrentWorkspaceId((prev) => {
      if (prev && ws.find((w) => w.id === prev)) return prev;
      return ws[0]?.id ?? null;
    });
  }, [user]);

  // Load teams + members + profiles + invitations for the current workspace
  const loadWorkspaceData = useCallback(async (workspaceId: string) => {
    // Teams
    const { data: teamData, error: teamErr } = await db
      .from("teams")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (teamErr) throw teamErr;
    const teamRows = (teamData ?? []).map(mapTeam);
    setTeams(teamRows);

    // Auto-select first team if none selected or selection is invalid
    setCurrentTeamId((prev) => {
      if (prev && teamRows.find((t) => t.id === prev)) return prev;
      return teamRows[0]?.id ?? null;
    });

    // Workspace members
    const { data: memberData, error: memberErr } = await db
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);
    if (memberErr) throw memberErr;
    const memberRows = (memberData ?? []).map(mapMember);
    setMembers(memberRows);

    // Team members for these teams
    const teamIds = teamRows.map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: tmData, error: tmErr } = await db
        .from("team_members")
        .select("*")
        .in("team_id", teamIds);
      if (tmErr) throw tmErr;
      setTeamMembers((tmData ?? []).map(mapTeamMember));
    } else {
      setTeamMembers([]);
    }

    // Profiles for these members
    const userIds = Array.from(new Set(memberRows.map((m) => m.userId)));
    if (userIds.length > 0) {
      const { data: profData, error: profErr } = await db
        .from("profiles")
        .select("*")
        .in("id", userIds);
      if (profErr) throw profErr;
      const profMap: Record<string, Profile> = {};
      (profData ?? []).forEach((p: any) => {
        profMap[p.id] = mapProfile(p);
      });
      setProfiles(profMap);
    } else {
      setProfiles({});
    }

    // Pending invitations
    const { data: invData, error: invErr } = await db
      .from("invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (invErr) throw invErr;
    setInvitations((invData ?? []).map(mapInvitation));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadWorkspaces();
    } catch (e) {
      console.error("Failed to load workspaces:", e);
    } finally {
      setLoading(false);
    }
  }, [loadWorkspaces]);

  // Initial load when user is set
  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  // Load workspace-scoped data when current workspace changes
  useEffect(() => {
    if (!currentWorkspaceId) {
      setTeams([]);
      setMembers([]);
      setTeamMembers([]);
      setProfiles({});
      setInvitations([]);
      return;
    }
    void loadWorkspaceData(currentWorkspaceId).catch((e) =>
      console.error("Failed to load workspace data:", e)
    );
  }, [currentWorkspaceId, loadWorkspaceData]);

  // ---- Computed ----

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId]
  );
  const currentTeam = useMemo(
    () => teams.find((t) => t.id === currentTeamId) ?? null,
    [teams, currentTeamId]
  );
  const myRole = useMemo<WorkspaceRole | null>(() => {
    if (!user || !currentWorkspaceId) return null;
    const m = members.find(
      (mm) => mm.workspaceId === currentWorkspaceId && mm.userId === user.id
    );
    return m?.role ?? null;
  }, [members, user, currentWorkspaceId]);
  const isAdmin = myRole === "owner" || myRole === "admin";

  // ---- Actions ----

  const setCurrentWorkspace = useCallback((id: string) => {
    setCurrentWorkspaceId(id);
    setCurrentTeamId(null); // reset team selection when switching workspace
  }, []);

  const setCurrentTeam = useCallback((id: string) => {
    setCurrentTeamId(id);
  }, []);

  const createWorkspace = useCallback(
    async (name: string): Promise<Workspace> => {
      if (!user) throw new Error("Not authenticated");
      const slug = `${slugify(name)}-${user.id.slice(0, 8)}`;
      const { data, error } = await supabase.schema("consulting").rpc("create_workspace", {
        p_name: name,
        p_slug: slug,
      });
      if (error) throw error;
      const newId = data as string;

      // Auto-create a default team
      const { data: teamData, error: teamErr } = await db
        .from("teams")
        .insert({
          workspace_id: newId,
          name: "Default",
          description: "Default team",
          created_by: user.id,
        })
        .select()
        .single();
      if (teamErr) throw teamErr;

      // Add creator as team lead
      await db.from("team_members").insert({
        team_id: teamData.id,
        user_id: user.id,
        role: "lead",
      });

      await refresh();
      setCurrentWorkspaceId(newId);
      setCurrentTeamId(teamData.id);

      return {
        id: newId,
        name,
        slug,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };
    },
    [user, refresh]
  );

  const createTeam = useCallback(
    async (name: string, description?: string): Promise<Team> => {
      if (!user || !currentWorkspaceId) throw new Error("No workspace selected");
      const { data, error } = await db
        .from("teams")
        .insert({
          workspace_id: currentWorkspaceId,
          name,
          description: description ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await db.from("team_members").insert({
        team_id: data.id,
        user_id: user.id,
        role: "lead",
      });
      await loadWorkspaceData(currentWorkspaceId);
      return mapTeam(data);
    },
    [user, currentWorkspaceId, loadWorkspaceData]
  );

  const inviteMember = useCallback(
    async (email: string, role: WorkspaceRole, teamIds: string[] = []): Promise<Invitation> => {
      if (!user || !currentWorkspaceId) throw new Error("No workspace selected");
      const { data, error } = await db
        .from("invitations")
        .insert({
          workspace_id: currentWorkspaceId,
          email: email.trim().toLowerCase(),
          role,
          team_ids: teamIds,
          invited_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await loadWorkspaceData(currentWorkspaceId);
      return mapInvitation(data);
    },
    [user, currentWorkspaceId, loadWorkspaceData]
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: WorkspaceRole): Promise<void> => {
      if (!currentWorkspaceId) return;
      const { error } = await db
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", currentWorkspaceId)
        .eq("user_id", userId);
      if (error) throw error;
      await loadWorkspaceData(currentWorkspaceId);
    },
    [currentWorkspaceId, loadWorkspaceData]
  );

  const removeMember = useCallback(
    async (userId: string): Promise<void> => {
      if (!currentWorkspaceId) return;
      const { error } = await db
        .from("workspace_members")
        .delete()
        .eq("workspace_id", currentWorkspaceId)
        .eq("user_id", userId);
      if (error) throw error;
      await loadWorkspaceData(currentWorkspaceId);
    },
    [currentWorkspaceId, loadWorkspaceData]
  );

  const cancelInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      if (!currentWorkspaceId) return;
      const { error } = await db.from("invitations").delete().eq("id", invitationId);
      if (error) throw error;
      await loadWorkspaceData(currentWorkspaceId);
    },
    [currentWorkspaceId, loadWorkspaceData]
  );

  const addUserToTeam = useCallback(
    async (teamId: string, userId: string): Promise<void> => {
      const { error } = await db
        .from("team_members")
        .insert({ team_id: teamId, user_id: userId, role: "member" });
      if (error) throw error;
      if (currentWorkspaceId) await loadWorkspaceData(currentWorkspaceId);
    },
    [currentWorkspaceId, loadWorkspaceData]
  );

  const removeUserFromTeam = useCallback(
    async (teamId: string, userId: string): Promise<void> => {
      const { error } = await db
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) throw error;
      if (currentWorkspaceId) await loadWorkspaceData(currentWorkspaceId);
    },
    [currentWorkspaceId, loadWorkspaceData]
  );

  const value: WorkspaceContextValue = {
    loading,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    teams,
    currentTeam,
    setCurrentTeam,
    members,
    teamMembers,
    profiles,
    invitations,
    myRole,
    isAdmin,
    refresh,
    createWorkspace,
    createTeam,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    addUserToTeam,
    removeUserFromTeam,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
