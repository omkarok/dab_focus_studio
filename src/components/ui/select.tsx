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
  React.useEffect(()=>{ if (value !== undefined) setInternal(value); }, [value]);
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
    setOpen(false);
  };
  return <SelectCtx.Provider value={{ value: internal, setValue, open, setOpen }}>{children}</SelectCtx.Provider>;
}
export function SelectTrigger({ className, children }: React.HTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SelectCtx);
  return (
    <button type="button" className={cn("h-10 px-3 rounded-xl border w-full text-left", className)} onClick={()=>ctx.setOpen?.(!ctx.open)}>
      {children}
    </button>
  );
}
export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectCtx);
  return <span className="opacity-80">{ctx.value ?? placeholder ?? "Select"}</span>;
}
export function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectCtx);
  if (!ctx.open) return null;
  return (
    <div className={cn("mt-1 w-full rounded-xl border bg-white dark:bg-neutral-900 p-1 shadow-lg", className)}>
      {children}
    </div>
  );
}
export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectCtx);
  return (
    <div role="option" tabIndex={0} onClick={()=>ctx.setValue?.(value)} className="px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
      {children}
    </div>
  );
}