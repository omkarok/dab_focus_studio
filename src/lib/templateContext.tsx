import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { Template, ColumnKey } from "@/FocusStudioStarter";
import { useProjects } from "@/lib/projectContext";

const LEGACY_KEY = "focus_studio_templates_v1";

function templateKeyForProject(projectId: string): string {
  return `acs_templates_${projectId}`;
}

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
  // ——— AI Consulting templates ———
  {
    name: "Client Discovery Call Prep",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Research client's industry & recent AI news", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Research","Client"] },
      { id: uid(), title: "Review client's tech stack & current pain points", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Research","Client"] },

      { id: uid(), title: "Prepare discovery question list (goals, data maturity, constraints)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Prep","Discovery"] },
      { id: uid(), title: "Draft 3 potential AI use cases to discuss", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Strategy","Use Cases"] },

      { id: uid(), title: "Prepare ROI talking points & benchmark data", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["ROI","Data"] },
      { id: uid(), title: "Set up meeting notes template & follow-up tracker", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ops","Notes"] },

      { id: uid(), title: "Queue case studies relevant to client's domain", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Sales","Case Study"] },
    ],
  },
  {
    name: "AI Strategy Workshop",
    columns: DEFAULT_COLUMNS,
    tasks: [
      {
        id: uid(),
        title: "Finalize workshop agenda & slide deck",
        priority: "P0",
        status: "now",
        createdAt: new Date().toISOString(),
        estimate: 3,
        tags: ["Workshop","Deck"],
        notes: "Sections:\n- Current state assessment\n- AI opportunity mapping\n- Feasibility vs. impact matrix\n- Roadmap prioritization\n- Q&A + next steps",
      },
      { id: uid(), title: "Prepare AI maturity assessment questionnaire", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Assessment","Workshop"] },

      { id: uid(), title: "Build opportunity-impact matrix template", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Framework","Strategy"] },
      { id: uid(), title: "Compile industry-specific AI case studies (3-5)", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Research","Case Study"] },

      { id: uid(), title: "Prepare hands-on demo: AI tool walkthrough", priority: "P1", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Demo","Workshop"] },
      { id: uid(), title: "Draft post-workshop summary & recommendations template", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Deliverable","Template"] },

      { id: uid(), title: "Set up feedback form for workshop attendees", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Feedback","Ops"] },
    ],
  },
  {
    name: "AI Pilot / PoC Sprint",
    columns: DEFAULT_COLUMNS,
    tasks: [
      {
        id: uid(),
        title: "Define pilot scope, success metrics & timeline",
        priority: "P0",
        status: "now",
        createdAt: new Date().toISOString(),
        estimate: 2,
        tags: ["Scope","PoC"],
        notes: "Key decisions:\n- [ ] Use case confirmed\n- [ ] Success criteria (accuracy, latency, cost)\n- [ ] Data access confirmed\n- [ ] Timeline (2-4 weeks)\n- [ ] Stakeholder sign-off",
      },
      { id: uid(), title: "Set up dev environment & API keys", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Setup","Dev"] },

      { id: uid(), title: "Build initial prompt/pipeline prototype", priority: "P0", status: "next", createdAt: new Date().toISOString(), estimate: 3, tags: ["Build","Prototype"] },
      { id: uid(), title: "Prepare sample dataset & evaluation harness", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Data","Eval"] },

      { id: uid(), title: "Run evaluation: accuracy, cost, latency benchmarks", priority: "P1", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Eval","Metrics"] },
      { id: uid(), title: "Document findings & build demo for stakeholders", priority: "P1", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Demo","Report"] },

      { id: uid(), title: "Draft go/no-go recommendation & production roadmap", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Strategy","Deliverable"] },
    ],
  },
  {
    name: "Client Deliverable Day",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Outline report structure & key findings", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Writing","Report"] },
      { id: uid(), title: "Write executive summary & recommendations", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Writing","Deliverable"] },

      { id: uid(), title: "Build supporting charts, diagrams & architecture visuals", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Design","Visuals"] },
      { id: uid(), title: "Write detailed technical appendix", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Writing","Technical"] },

      { id: uid(), title: "Internal review pass: clarity, accuracy, formatting", priority: "P1", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Review","QA"] },
      { id: uid(), title: "Prepare client presentation deck (5-10 slides)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Deck","Presentation"] },

      { id: uid(), title: "Send deliverable + schedule walkthrough call", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Client","Follow-up"] },
    ],
  },
  {
    name: "Business Development Day",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Follow up on warm leads & pending proposals", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Sales","Pipeline"] },
      { id: uid(), title: "Draft proposal for new prospect", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Proposal","Sales"] },

      { id: uid(), title: "Update CRM: pipeline stages, next actions, notes", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["CRM","Ops"] },
      { id: uid(), title: "LinkedIn outreach: connect with 5 target contacts", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Outreach","LinkedIn"] },

      { id: uid(), title: "Refine service offerings page & pricing", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Marketing","Pricing"] },
      { id: uid(), title: "Research 3 new companies to target", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Research","Prospecting"] },

      { id: uid(), title: "Review & update invoice tracker + outstanding payments", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Finance","Ops"] },
    ],
  },
  {
    name: "AI Audit & Assessment",
    columns: DEFAULT_COLUMNS,
    tasks: [
      {
        id: uid(),
        title: "Map client's current AI/ML usage across departments",
        priority: "P0",
        status: "now",
        createdAt: new Date().toISOString(),
        estimate: 3,
        tags: ["Audit","Discovery"],
        notes: "Areas to assess:\n- [ ] Data infrastructure & quality\n- [ ] Existing ML models & pipelines\n- [ ] Team capabilities & skill gaps\n- [ ] Vendor/tool landscape\n- [ ] Governance & compliance posture",
      },
      { id: uid(), title: "Conduct stakeholder interviews (3-5 dept leads)", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Interviews","Stakeholder"] },

      { id: uid(), title: "Score AI maturity across 5 dimensions", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Assessment","Framework"] },
      { id: uid(), title: "Identify quick wins vs. strategic bets", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Strategy","Prioritization"] },

      { id: uid(), title: "Draft risk register: data privacy, bias, vendor lock-in", priority: "P1", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Risk","Compliance"] },
      { id: uid(), title: "Build 6-month AI roadmap with milestones", priority: "P1", status: "later", createdAt: new Date().toISOString(), estimate: 2, tags: ["Roadmap","Strategy"] },

      { id: uid(), title: "Compile final assessment report & present to leadership", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 2, tags: ["Deliverable","Presentation"] },
    ],
  },
  {
    name: "Content & Thought Leadership",
    columns: DEFAULT_COLUMNS,
    tasks: [
      { id: uid(), title: "Outline article: AI trend or client lesson learned", priority: "P0", status: "now", createdAt: new Date().toISOString(), estimate: 1, tags: ["Writing","Content"] },
      { id: uid(), title: "Write first draft (800-1200 words)", priority: "P1", status: "now", createdAt: new Date().toISOString(), estimate: 2, tags: ["Writing","Draft"] },

      { id: uid(), title: "Edit for clarity, add data points & examples", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 1, tags: ["Editing","Content"] },
      { id: uid(), title: "Create LinkedIn carousel or infographic", priority: "P1", status: "next", createdAt: new Date().toISOString(), estimate: 2, tags: ["Design","Social"] },

      { id: uid(), title: "Schedule LinkedIn post + newsletter send", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Scheduling","Social"] },
      { id: uid(), title: "Engage with 10 comments/posts in AI consulting space", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Engagement","LinkedIn"] },

      { id: uid(), title: "Brainstorm 3 future content ideas from client work", priority: "P2", status: "backlog", createdAt: new Date().toISOString(), estimate: 1, tags: ["Ideas","Pipeline"] },
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

      { id: uid(), title: "Read 20 pages (AI/consulting)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Learning"] },
      { id: uid(), title: "Reflect & journal (10m)", priority: "P2", status: "later", createdAt: new Date().toISOString(), estimate: 1, tags: ["Mindset"] },
    ],
  },
];

function loadCustomTemplatesForProject(projectId: string): Template[] {
  try {
    const key = templateKeyForProject(projectId);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as Template[];
    }
    // Migration: for default project, check legacy key
    if (projectId === "default") {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Template[];
        // Filter out templates that match default template names (those are built-in)
        const defaultNames = new Set(DEFAULT_TEMPLATES.map((t) => t.name));
        const custom = parsed.filter((t) => !defaultNames.has(t.name));
        if (custom.length > 0) {
          try {
            localStorage.setItem(templateKeyForProject(projectId), JSON.stringify(custom));
          } catch {
            // ignore
          }
        }
        // Clean up legacy key
        localStorage.removeItem(LEGACY_KEY);
        return custom;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

interface TemplateContextValue {
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
}

const TemplateContext = createContext<TemplateContextValue | undefined>(undefined);

export function TemplateProvider({ children }: { children: React.ReactNode }) {
  const { activeProjectId } = useProjects();
  const [customTemplates, setCustomTemplates] = useState<Template[]>(() =>
    loadCustomTemplatesForProject(activeProjectId)
  );

  // When active project changes, load that project's custom templates
  useEffect(() => {
    setCustomTemplates(loadCustomTemplatesForProject(activeProjectId));
  }, [activeProjectId]);

  // Persist custom templates whenever they change
  useEffect(() => {
    try {
      const key = templateKeyForProject(activeProjectId);
      localStorage.setItem(key, JSON.stringify(customTemplates));
    } catch {
      // ignore
    }
  }, [customTemplates, activeProjectId]);

  // Combine default templates (available to all projects) with project-scoped custom ones
  const templates = useMemo(
    () => [...DEFAULT_TEMPLATES, ...customTemplates],
    [customTemplates]
  );

  // setTemplates: when user adds a template, it goes into custom templates
  const setTemplates: React.Dispatch<React.SetStateAction<Template[]>> = useCallback(
    (action) => {
      setCustomTemplates((prevCustom) => {
        const allPrev = [...DEFAULT_TEMPLATES, ...prevCustom];
        const next = typeof action === "function" ? action(allPrev) : action;
        // Only keep the non-default templates as custom
        const defaultNames = new Set(DEFAULT_TEMPLATES.map((t) => t.name));
        return next.filter((t) => !defaultNames.has(t.name));
      });
    },
    []
  );

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
