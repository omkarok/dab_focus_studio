// ============================================================
// WorkspaceBootstrap — first-run UI for the very first user.
// Shown when the authenticated user has no workspace memberships
// AND is the first profile in the system. Lets them create the
// initial workspace and become its owner.
// ============================================================

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { supabase, db } from "@/lib/supabase";

function slugify(name: string, suffix: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  return `${base}-${suffix}`;
}

export function WorkspaceBootstrap() {
  const { user, refreshMembership, signOut } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const slug = slugify(name.trim(), user.id.slice(0, 8));
      const { data: wsId, error: wsErr } = await supabase
        .schema("consulting")
        .rpc("create_workspace", { p_name: name.trim(), p_slug: slug });
      if (wsErr) throw wsErr;

      // Create a default team in the new workspace
      const { error: teamErr } = await db.from("teams").insert({
        workspace_id: wsId as string,
        name: "Default",
        description: "Default team",
        created_by: user.id,
      });
      if (teamErr) throw teamErr;

      // Refresh membership so AuthGate hands off to the app
      await refreshMembership();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
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
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 3v18M3 9h6" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Create your workspace</h1>
          <p className="text-sm text-muted-foreground">
            You're the first user. Name your workspace to get started.
          </p>
        </div>

        <Card className="rounded-xl">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="ws-name" className="block text-xs font-medium text-muted-foreground mb-1">
                  Workspace name
                </label>
                <Input
                  id="ws-name"
                  type="text"
                  placeholder="Acme Consulting"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>
                {submitting ? "Creating..." : "Create workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
