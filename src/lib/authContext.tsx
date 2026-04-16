// ============================================================
// Auth context — wraps Supabase auth for React
// Falls back gracefully when Supabase is not configured.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AuthUser } from "@/lib/types";

// ---- Public API types ----

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
};

// ---- Context ----

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---- Helpers ----

/** Map a Supabase user object to our AuthUser shape. */
function mapUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: sbUser.id,
    email: sbUser.email ?? "",
    name: (sbUser.user_metadata?.full_name as string) ?? (sbUser.user_metadata?.name as string) ?? undefined,
    avatarUrl: (sbUser.user_metadata?.avatar_url as string) ?? undefined,
  };
}

// ---- Provider ----

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured());

  // Bootstrap: fetch current session on mount & listen for changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? mapUser(session.user) : null);
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ---- Auth methods ----

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
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmail,
    signUp,
    signInWithGoogle,
    signOut,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- Hook ----

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
