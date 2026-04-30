// ============================================================
// MembersPanel — workspace members + pending invitations.
// Visible to anyone in the workspace; invite/role/remove actions
// are gated to owners and admins.
// ============================================================

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspaceContext";
import { useAuth } from "@/lib/authContext";
import type { WorkspaceRole } from "@/lib/types";
import { UserPlus, X, Crown, Shield, User as UserIcon, Mail, Check } from "lucide-react";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_ICON: Record<WorkspaceRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  member: <UserIcon className="h-3 w-3" />,
};

export function MembersPanel() {
  const { user } = useAuth();
  const {
    currentWorkspace,
    members,
    profiles,
    invitations,
    isAdmin,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
  } = useWorkspace();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!currentWorkspace) {
    return (
      <Card className="rounded-xl">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No workspace selected.
        </CardContent>
      </Card>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviteSuccess(null);
    setSubmitting(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation";
      // Common cases the user should understand
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        setInviteError("An invitation for this email already exists.");
      } else {
        setInviteError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    if (a.role !== b.role) return order[a.role] - order[b.role];
    return (profiles[a.userId]?.email ?? "").localeCompare(profiles[b.userId]?.email ?? "");
  });

  return (
    <div className="space-y-4">
      {/* Invite form (admin only) */}
      {isAdmin && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite to {currentWorkspace.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                    setInviteSuccess(null);
                  }}
                  required
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={submitting || !inviteEmail.trim()}>
                {submitting ? "Sending..." : "Invite"}
              </Button>
            </form>
            {inviteError && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">{inviteError}</div>
            )}
            {inviteSuccess && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                {inviteSuccess}. They can sign up at any time with this email.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{inv.email}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    {ROLE_ICON[inv.role]}
                    <span>{ROLE_LABEL[inv.role]}</span>
                    <span>·</span>
                    <span>Invited {new Date(inv.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => void cancelInvitation(inv.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active members */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {sortedMembers.map((m) => {
            const profile = profiles[m.userId];
            const isCurrent = m.userId === user?.id;
            const isOnlyOwner =
              m.role === "owner" && members.filter((x) => x.role === "owner").length === 1;
            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent shrink-0">
                  {(profile?.name ?? profile?.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {profile?.name ?? profile?.email ?? m.userId}
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                        You
                      </Badge>
                    )}
                  </div>
                  {profile?.name && (
                    <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                  )}
                </div>
                {isAdmin && !isCurrent && !isOnlyOwner ? (
                  <>
                    <Select
                      value={m.role}
                      onValueChange={(v) => void updateMemberRole(m.userId, v as WorkspaceRole)}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        if (confirm(`Remove ${profile?.email ?? m.userId} from the workspace?`)) {
                          void removeMember(m.userId);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    {ROLE_ICON[m.role]}
                    {ROLE_LABEL[m.role]}
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
