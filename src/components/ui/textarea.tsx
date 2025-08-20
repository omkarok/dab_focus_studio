import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea ref={ref} className={cn("w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-black dark:bg-neutral-900 dark:border-neutral-700 dark:text-white", className)} {...props} />
  );
});
Textarea.displayName = "Textarea";