import React, { createContext, useContext, useEffect, useState } from "react";
import type { Template, ColumnKey } from "@/FocusStudioStarter";

const LS_KEY = "focus_studio_templates_v1";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const DEFAULT_COLUMNS: ColumnKey[] = ["now", "next", "later", "backlog", "done"];

export const DEFAULT_TEMPLATES: Template[] = [
  {
    name: "Blank",
    tasks: [],
    columns: DEFAULT_COLUMNS,
  },
  {
    name: "Deep Work Day",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Plan day in 5 minutes", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 1 },
      { id: uid(), title: "Two 50-min focus blocks", priority: "P0", status: "next", createdAt: new Date().toISOString(), estimate: 2 },
      { id: uid(), title: "Inbox Zero (15m)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1 },
      { id: uid(), title: "Walk + water + stretch", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1 },
    ],
  },
  // ——— DAB-focused templates ———
  {
    name: "DAB GTM Sprint — Today",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Finalize GitHub GTM one-pager", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["DAB","GTM"] },
      { id: uid(), title: "Assemble demo storyboard screenshots", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["DAB","Demo"] },

      { id: uid(), title: "Update homepage: 5 scholarships secured + 20 seats remaining", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["DAB","Landing"] },
      { id: uid(), title: "Draft sponsor email with projected outcomes", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Partnership","Email"] },

      { id: uid(), title: "Prep GTM metrics table (CAC, LTV, MRR scenarios)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["GTM","Metrics"] },
      { id: uid(), title: "Record 90s demo teaser", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Video","Social"] },

      { id: uid(), title: "Set up UTM tracking for GitHub ref", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Analytics"] },
    ],
  },
  {
    name: "Partnership Day — Outreach & Collab",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Scoutflo: finalize one-pager & send assets", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Partnership","Scoutflo"] },
      { id: uid(), title: "Zenduty: tailor proposal (on-call + incident sims)", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Partnership","Zenduty"] },

      { id: uid(), title: "ClickHouse for Observability: outreach email + CTA", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["ClickHouse","Observability"] },
      { id: uid(), title: "Collect 3 logo/brand guidelines from partners", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Brand"] },

      { id: uid(), title: "Draft social co-announcement copy options", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Social","Copy"] },
      { id: uid(), title: "Create shared folder structure for partner assets", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops"] },

      { id: uid(), title: "Spreadsheet: partner tracking (stage, owner, next step)", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["CRM"] },
    ],
  },
  {
    name: "Content Ship Day — Newsletter + Social",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Outline newsletter (proof + momentum + CTA)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Newsletter","DAB"] },
      { id: uid(), title: "Write newsletter draft v1", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Writing"] },

      { id: uid(), title: "Edit to 9.9/10 (clarity, pacing, punchy CTA)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Editing"] },
      { id: uid(), title: "Create LinkedIn carousel (5–7 slides)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Design","Social"] },

      { id: uid(), title: "Record 60–90s video teaser", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Video"] },
      { id: uid(), title: "Schedule posts + newsletter send", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Scheduling"] },

      { id: uid(), title: "Collect 3 quick testimonials for social proof", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Testimonial"] },
    ],
  },
  {
    name: "Interview Prep — Observability Walkthrough",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Spin up EKS (sample app + Ingress/ALB)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 3, tags: ["EKS","K8s"] },
      { id: uid(), title: "Instrument APM (traces, metrics, logs)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["APM","Observability"] },

      { id: uid(), title: "Run synthetic error + latency scenarios", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["SRE","Chaos"] },
      { id: uid(), title: "Prepare 10 FAQ answers (TSM focus)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Interview"] },

      { id: uid(), title: "Tear-down + cleanup script", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops","Cleanup"] },
      { id: uid(), title: "Deck: concise demo flow (5 slides)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Deck"] },

      { id: uid(), title: "Practice 15-min live walkthrough", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Practice"] },
    ],
  },
  {
    name: "Ops & Finance — Cleanup",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Audit seat counter on landing page", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["DAB","Landing"] },
      { id: uid(), title: "Payment flow sanity check (test txn + redirect)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Payments"] },

      { id: uid(), title: "Webhook signature validation notes", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Webhook"] },
      { id: uid(), title: "Invoice template + GST checklist", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Finance"] },

      { id: uid(), title: "CRM: tag new leads + next actions", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["CRM"] },
      { id: uid(), title: "Auto-reply for scholarship inquiries", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops","Automation"] },

      { id: uid(), title: "Back up docs & assets", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Backup"] },
    ],
  },
  {
    name: "Focus Studio OSS — Shipping",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Repo init + MIT license + README", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["OSS","Repo"] },
      { id: uid(), title: "Add two starter templates (Deep Work, Sprint Day)", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Templates"] },

      { id: uid(), title: "Set up shadcn/ui + Tailwind config", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["UI"] },
      { id: uid(), title: "Demo GIFs (focus mode + import/export)", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Docs","Demo"] },

      { id: uid(), title: "Issue templates + contribution guide", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["OSS"] },
      { id: uid(), title: "Publish template on GitHub + tweet", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Launch"] },

      { id: uid(), title: "Add JSON schema for templates", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 2, tags: ["DX"] },
    ],
  },
  {
    name: "Calm Reset — Light Day",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Plan day in 5 minutes", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Routine"] },
      { id: uid(), title: "One 50-min deep work block", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Focus"] },

      { id: uid(), title: "Inbox Zero (15m)", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops"] },
      { id: uid(), title: "Walk + water + stretch", priority: "P2", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Health"] },

      { id: uid(), title: "Read 20 pages (AI/DevOps)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Learning"] },
      { id: uid(), title: "Reflect & journal (10m)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Mindset"] },
    ],
  },
];

interface TemplateContextValue {
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
}

const TemplateContext = createContext<TemplateContextValue | undefined>(undefined);

export function TemplateProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Template[]) : DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(templates));
    } catch {}
  }, [templates]);

  return (
    <TemplateContext.Provider value={{ templates, setTemplates }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplates() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplates must be used within TemplateProvider");
  return ctx;
}

