// ============================================================
// Auth context — wraps Supabase auth and resolves the user's
// membership state (bootstrap / no-invitation / member) so the
// app gate can route them appropriately.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase, db, isSupabaseConfigured } from "@/lib/supabase";
import type { AuthUser, MembershipState } from "@/lib/types";

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  membershipState: MembershipState;
  refreshMembership: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: sbUser.id,
    email: sbUser.email ?? "",
    name:
      (sbUser.user_metadata?.full_name as string) ??
      (sbUser.user_metadata?.name as string) ??
      undefined,
    avatarUrl: (sbUser.user_metadata?.avatar_url as string) ?? undefined,
  };
}

/**
 * Ensure a row exists in consulting.profiles for this user. The
 * insert is idempotent (PK on auth.users.id with on conflict do nothing).
 * RLS allows the user to insert their own profile row.
 */
async function upsertProfile(user: AuthUser): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await db.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      avatar_url: user.avatarUrl ?? null,
    },
    { onConflict: "id" }
  );
}

/**
 * Claim any pending invitations for this user, then check if they have
 * any workspace membership. Returns the membership state.
 */
async function resolveMembership(user: AuthUser): Promise<MembershipState> {
  if (!isSupabaseConfigured()) return "member"; // localStorage-only mode skips the gate

  await upsertProfile(user);

  // Try to claim any pending invites first
  try {
    await supabase.schema("consulting").rpc("claim_pending_invitations");
  } catch {
    // Non-fatal — the bootstrap user has no invites and that's fine
  }

  // Check membership
  const { data: memberships, error: memErr } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memErr) throw memErr;
  if (memberships && memberships.length > 0) return "member";

  // No membership — check if this is the bootstrap user
  const { data: isBootstrap, error: bootErr } = await supabase
    .schema("consulting")
    .rpc("is_bootstrap_user");
  if (bootErr) throw bootErr;
  if (isBootstrap === true) return "bootstrap";

  return "no-invitation";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured());
  const [membershipState, setMembershipState] = useState<MembershipState>(
    isSupabaseConfigured() ? "unknown" : "member"
  );

  const refreshMembership = useCallback(async () => {
    if (!user) {
      setMembershipState("unknown");
      return;
    }
    try {
      const state = await resolveMembership(user);
      setMembershipState(state);
    } catch (e) {
      // If we can't resolve, treat as no-invitation rather than crashing.
      // The user can sign out and retry.
      console.error("Failed to resolve membership:", e);
      setMembershipState("no-invitation");
    }
  }, [user]);

  // Bootstrap: fetch session + listen for changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ? mapUser(session.user) : null;
      setUser(u);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resolve membership whenever user changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (!user) {
      setMembershipState("unknown");
      return;
    }
    setMembershipState("unknown");
    void refreshMembership();
  }, [user, refreshMembership]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setMembershipState("unknown");
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    membershipState,
    refreshMembership,
    signInWithEmail,
    signUp,
    signInWithGoogle,
    signOut,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
