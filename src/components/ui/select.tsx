import * as React from "react";
import { cn } from "@/lib/utils";

type Ctx = {
  value?: string;
  setValue?: (v: string)=>void;
  open?: boolean;
  setOpen?: (o: boolean)=>void;
  placeholder?: string;
};
const SelectCtx = React.createContext<Ctx>({});

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string)=>void; children: React.ReactNode }) {
  const [internal, setInternal] = React.useState<string | undefined>(value);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{ if (value !== undefined) setInternal(value); }, [value]);
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return <div ref={ref} className="relative"><SelectCtx.Provider value={{ value: internal, setValue, open, setOpen }}>{children}</SelectCtx.Provider></div>;
}
export function SelectTrigger({ className, children, onClick }: React.HTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SelectCtx);
  return (
    <button
      type="button"
      className={cn(
        "h-10 px-3 rounded-xl border border-border bg-card text-card-foreground w-full text-left text-sm",
        "hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
      onClick={(e) => { onClick?.(e); ctx.setOpen?.(!ctx.open); }}
    >
      {children}
      <span className="float-right text-muted-foreground ml-2">&#x25BE;</span>
    </button>
  );
}
export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectCtx);
  return <span className="text-sm">{ctx.value ?? placeholder ?? "Select"}</span>;
}
export function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectCtx);
  if (!ctx.open) return null;
  return (
    <div className={cn(
      "absolute top-full left-0 z-50 mt-1 w-full min-w-[160px] rounded-xl border border-border bg-card p-1 shadow-lg",
      "animate-in fade-in-0 zoom-in-95",
      className
    )}>
      {children}
    </div>
  );
}
export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectCtx);
  const active = ctx.value === value;
  return (
    <div
      role="option"
      tabIndex={0}
      onClick={()=>ctx.setValue?.(value)}
      className={cn(
        "px-3 py-2 rounded-lg text-sm cursor-pointer",
        active
          ? "bg-accent/10 text-accent font-medium"
          : "hover:bg-muted"
      )}
    >
      {children}
    </div>
  );
}
