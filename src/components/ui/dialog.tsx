import * as React from "react";
import { cn } from "@/lib/utils";

type Ctx = { open: boolean; setOpen: (v: boolean)=>void };
const DialogCtx = React.createContext<Ctx | null>(null);

export function Dialog({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (v: boolean)=>void; children: React.ReactNode }) {
  const [o, setO] = React.useState(!!open);
  React.useEffect(()=>{ if (open !== undefined) setO(open); }, [open]);
  const setOpen = (v: boolean) => { setO(v); onOpenChange?.(v); };
  return <DialogCtx.Provider value={{ open: o, setOpen }}>{children}</DialogCtx.Provider>;
}
export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(DialogCtx)!;
  const child = React.Children.only(children);
  const props = { onClick: () => ctx.setOpen(true) };
  return asChild ? React.cloneElement(child, props) : <button onClick={()=>ctx.setOpen(true)}>{children}</button>;
}
export function DialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(DialogCtx)!;
  if (!ctx.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>ctx.setOpen(false)} />
      <div className={cn(
        "relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}>
        {children}
      </div>
    </div>
  );
}
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />;
}
