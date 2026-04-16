// ============================================================
// AuthGate — Login / signup UI that wraps the app.
// - When Supabase is NOT configured: passthrough (children render directly).
// - When Supabase IS configured and user is NOT authenticated: shows auth form.
// - When authenticated: renders children.
// ============================================================

import React, { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/authContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AuthMode = "signin" | "signup";

export function AuthGate({ children }: { children: React.ReactNode }) {
  // If Supabase is not configured, render children directly (localStorage mode)
  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  return <AuthGateInner>{children}</AuthGateInner>;
}

/** Inner component that safely uses useAuth (Supabase is configured). */
function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithEmail, signUp, signInWithGoogle, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Show a simple spinner while session is being fetched
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Authenticated: render the app
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // ---- Auth form ----

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-accent"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {mode === "signin" ? "Sign in to" : "Create your"} AI Consulting Studio
            {mode === "signup" ? " account" : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Welcome back. Sign in to sync your projects."
              : "Get started with cloud sync and collaboration."}
          </p>
        </div>

        {/* Card with form */}
        <Card className="rounded-xl">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-muted-foreground mb-1">
                    Full name
                  </label>
                  <Input
                    id="auth-name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-muted-foreground mb-1">
                  Password
                </label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google sign-in */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Toggle mode */}
            <div className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-accent hover:underline font-medium"
                    onClick={() => { setMode("signup"); setError(null); }}
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-accent hover:underline font-medium"
                    onClick={() => { setMode("signin"); setError(null); }}
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground/60">
          Your data is stored securely. Works offline with local storage when not signed in.
        </p>
      </div>
    </div>
  );
}
