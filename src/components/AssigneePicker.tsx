// ============================================================
// AssigneePicker — compact dropdown to assign a task to a
// workspace member. Shows the assignee's avatar/initial when set.
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/workspaceContext";
import { UserCircle2, X } from "lucide-react";

interface AssigneePickerProps {
  assigneeId?: string;
  onChange: (assigneeId: string | undefined) => void;
  size?: "sm" | "md";
}

export function AssigneePicker({ assigneeId, onChange, size = "sm" }: AssigneePickerProps) {
  const { members, profiles } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const assignee = assigneeId ? profiles[assigneeId] : null;
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        title={assignee?.name ?? assignee?.email ?? "Assign task"}
        className={`${dim} rounded-full border border-border flex items-center justify-center hover:border-accent transition-colors ${
          assignee ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
        }`}
      >
        {assignee ? (
          (assignee.name ?? assignee.email).slice(0, 1).toUpperCase()
        ) : (
          <UserCircle2 className="h-3.5 w-3.5" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-[220px] rounded-xl border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="px-3 py-2 border-b border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Assign to
          </div>

          {assigneeId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-sm text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Unassign
            </button>
          )}

          <div className="max-h-[240px] overflow-y-auto py-1">
            {members.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No members yet</div>
            ) : (
              members.map((m) => {
                const p = profiles[m.userId];
                const isSelected = m.userId === assigneeId;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(m.userId);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                      isSelected ? "bg-accent/10 text-accent" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-medium text-accent shrink-0">
                      {(p?.name ?? p?.email ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{p?.name ?? p?.email ?? m.userId}</div>
                      {p?.name && <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
