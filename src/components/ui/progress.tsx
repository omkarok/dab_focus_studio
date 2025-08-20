import * as React from "react";
export function Progress({ value=0, className="" }: { value?: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 ${className}`}>
      <div className="h-2 rounded-full bg-black dark:bg-white" style={{ width: `${v}%` }} />
    </div>
  );
}