import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "destructive" | "outline";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<Variant,string> = {
      default: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
      secondary: "bg-muted hover:bg-muted/80 text-foreground",
      ghost: "hover:bg-muted text-foreground",
      destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      outline: "border border-border hover:bg-muted text-foreground",
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
