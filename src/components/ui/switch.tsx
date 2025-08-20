import * as React from "react";
type Props = { id?: string; checked?: boolean; onCheckedChange?: (checked: boolean)=>void };
export function Switch({ id, checked, onCheckedChange }: Props) {
  return (
    <label htmlFor={id} className="inline-flex items-center cursor-pointer">
      <input id={id} type="checkbox" className="sr-only" checked={!!checked} onChange={(e)=>onCheckedChange?.(e.target.checked)} />
      <span className={`relative inline-block h-5 w-9 rounded-full transition ${checked ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white dark:bg-black transition ${checked ? "translate-x-4" : ""}`}></span>
      </span>
    </label>
  );
}