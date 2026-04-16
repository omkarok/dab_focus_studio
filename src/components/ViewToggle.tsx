import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Calendar } from "lucide-react";

export interface ViewToggleProps {
  view: "board" | "calendar";
  onViewChange: (view: "board" | "calendar") => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-muted/50 p-0.5">
      <Button
        variant={view === "board" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs rounded-lg gap-1.5"
        onClick={() => onViewChange("board")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </Button>
      <Button
        variant={view === "calendar" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs rounded-lg gap-1.5"
        onClick={() => onViewChange("calendar")}
      >
        <Calendar className="h-3.5 w-3.5" />
        Calendar
      </Button>
    </div>
  );
}
