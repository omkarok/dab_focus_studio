import * as React from "react";
import { cn } from "@/lib/utils";

type Ctx = { value: string; setValue: (v: string)=>void };
const TabsCtx = React.createContext<Ctx | null>(null);

export function Tabs({ value, defaultValue, onValueChange, children, className }: { value?: string; defaultValue?: string; onValueChange?: (v: string)=>void; children: React.ReactNode; className?: string }) {
  const [v, setV] = React.useState(defaultValue ?? (value ?? ""));
  React.useEffect(()=>{ if (value !== undefined) setV(value); }, [value]);
  const setValue = (val: string) => { setV(val); onValueChange?.(val); };
  return <div className={className}><TabsCtx.Provider value={{ value: v, setValue }}>{children}</TabsCtx.Provider></div>;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-xl border border-border bg-muted/50 p-1 gap-1", className)} {...props} />;
}
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <button className={cn(
      "px-3 py-1.5 rounded-lg text-sm transition-colors",
      active ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )} onClick={()=>ctx.setValue(value)}>
      {children}
    </button>
  );
}
export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className={cn("mt-3", className)}>{children}</div>;
}
