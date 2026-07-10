# Focus Studio as a Consulting OS

Focus Studio runs the **bots.ai Operating System**: a research-lab consulting
practice where every engagement compounds into three assets — client results,
published research, and reusable platform IP. This document maps the operating
model onto the app.

The guiding design principle is the doctrine's own: **a stable canonical core
with all engagement variance externalized as declarative data.** The engine
(this React app) never forks per client. Everything specific to the operating
model lives as data under `src/consultingOS/`.

## The OS surface

A new top-level **OS** view (`src/consultingOS/ConsultingOSView.tsx`) has five
tabs that mirror the document:

| Tab | Maps to | What it does |
| --- | --- | --- |
| **Direction** | Part I | Vision, mission, the seven non-negotiables, the flywheel. |
| **Pipeline** | Part III lifecycle | Engagements across E0 → E8, plus a cockpit for the active engagement (stage, lane, commercial figures, disagree-and-commit register, IP register, failure taxonomy, harvest checklist). |
| **SOP Library** | Part III | Every SOP in its canonical schema. Run one onto the active engagement's board; draft AI-EXEC steps with the Executor; check the gate with the Verifier. |
| **Nudges** | Part II role 3 | The scheduler: next expected action, owner, deadline, and standard for every engagement, plus doctrine breaches. |
| **Metrics** | Part IV | Live readings of the eight governing metrics with threshold status. |

A bell in the header surfaces the count of actionable (overdue / breach) nudges
and deep-links to the Nudges tab.

## Engagements = projects

An engagement is a project. Its OS state is an `EngagementProfile`
(`src/consultingOS/types.ts`) layered on top via `EngagementProvider`
(`engagementContext.tsx`), persisted per project in `localStorage`
(`acs_engagement_<projectId>`). The shared, DB-backed task board remains the
**execution substrate** — where the SOP steps actually get done.

The profile carries the lifecycle stage, the lane and data-boundary posture, the
commercial inputs the metrics need, and the research spine (failure taxonomy, IP
register, disagree-and-commit register, harvest record).

## SOPs are executable

Each SOP (`sops.ts`) is written to the canonical schema — trigger, inputs, steps
(`[AI-EXEC]` / `[HUMAN]`), outputs, standard, timeline, gate
(`[AI-VERIFY]` / `[HUMAN-GATE]`), failure path. Running a SOP
(`instantiate.ts`) seeds the board: every step becomes a task tagged with its
role and SOP code, and a closing gate task carries the Standard as its
definition of done. Running a lifecycle SOP advances the engagement's stage.

## The three-role AI architecture

`agents.ts` implements the model's three roles:

1. **Executor** — drafts the artifact an `[AI-EXEC]` step should produce.
2. **Verifier** — a *separate* pass that checks a run against its Standard and
   returns pass / fail-with-findings; findings are traces. The gate never
   passes while a seeded task is open.
3. **Nudge system** (`nudges.ts`) — computes the next expected action, owner,
   deadline, and standard, and raises doctrine breaches (concentration > 40%,
   lane unresolved past E1, harvest debt, open disagree-and-commit items at E6).

Both agents are **AI-accelerated, not AI-dependent**: with
`VITE_OPENAI_API_KEY` set they use an LLM; without it they fall back to
deterministic behaviour (structured skeletons, completion-based verification) so
the OS is always usable. This honours doctrine #1 — reality contact over
fabricated output.

## The governing metrics

`metrics.ts` computes the eight Part IV metrics from the engagement profiles.
Where an input does not exist, the metric reads **"unmeasured"** rather than a
fabricated number — numeric or explicitly unmeasured, never false precision.

## Extending without forking

- **New SOP or a revision** → edit `sops.ts`. The library, board instantiation,
  nudges, and verifier pick it up. (Change control: a SOP change should carry
  evidence from a real engagement, per the document.)
- **New doctrine, flywheel node, or metric definition** → edit `os.ts`.
- **A shared, multi-user engagement store** → promote `EngagementProfile` to a
  `consulting.engagements` table. The profile is already declarative, so the
  engine does not change — only the persistence adapter in `engagementContext`.
