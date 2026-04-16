import * as React from "react";

export function Progress({ value=0, className="" }: { value?: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full h-2 rounded-full bg-muted ${className}`}>
      <div
        className="h-2 rounded-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
