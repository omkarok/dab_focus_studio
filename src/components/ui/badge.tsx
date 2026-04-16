import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant="default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default"|"secondary"|"outline" }) {
  const styles = {
    default: "bg-accent text-accent-foreground",
    secondary: "bg-muted text-muted-foreground",
    outline: "border border-border text-foreground",
  } as const;
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", styles[variant], className)} {...props} />;
}
