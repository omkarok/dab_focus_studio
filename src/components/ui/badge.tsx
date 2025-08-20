import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant="default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default"|"secondary"|"outline" }) {
  const styles = {
    default: "bg-black text-white dark:bg-white dark:text-black",
    secondary: "bg-neutral-200 text-black dark:bg-neutral-800 dark:text-white",
    outline: "border border-neutral-300 dark:border-neutral-700",
  } as const;
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs", styles[variant], className)} {...props} />;
}