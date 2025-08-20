import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "destructive" | "outline";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<Variant,string> = {
      default: "bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90",
      secondary: "bg-neutral-200 hover:bg-neutral-300 text-black dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white",
      ghost: "hover:bg-black/5 dark:hover:bg-white/10",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800",
    };
    const sizes = {
      sm: "h-8 px-3",
      md: "h-10 px-4",
      icon: "h-9 w-9 p-0",
    };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
    );
  }
);
Button.displayName = "Button";