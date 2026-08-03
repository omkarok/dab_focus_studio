# Focus Studio — a Consulting OS (React + Tailwind)

Focus Studio is a focus dashboard that runs the **bots.ai Operating System**: a
research-lab consulting practice where every engagement compounds into client
results, published research, and reusable platform IP. It pairs a focused task
board with an operating-system layer that turns the practice's doctrine, SOP
library, and governing metrics into working software.

See [`docs/CONSULTING_OS.md`](docs/CONSULTING_OS.md) for how the operating model
maps onto the app.

## Quickstart
```bash
npm i
npm run dev
```

Optionally set `VITE_OPENAI_API_KEY` (and `VITE_OPENAI_MODEL`, default `gpt-4.1-mini`) to enable AI-powered subtasks, the planning chatbot, and the OS Executor/Verifier agents. If you have an AI Grants India key, supply it via `VITE_OPENAI_API_KEY`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable multi-tenant, team-shared boards.

## Features

### Consulting OS
- **Direction** — vision, mission, the seven non-negotiables, and the flywheel.
- **Pipeline** — engagements across the E0 → E8 lifecycle, with a cockpit for stage, lane, commercial figures, the disagree-and-commit register, IP register, failure taxonomy, and harvest checklist.
- **SOP Library** — every SOP in its canonical schema; run one to seed the board with its steps (tagged AI-EXEC / HUMAN) and a gate task carrying the Standard.
- **Three-role agents** — Executor drafts AI-EXEC steps, Verifier checks a run against its Standard, and the Nudge system says what's next (owner, deadline, standard) and flags doctrine breaches. AI-accelerated, with deterministic fallbacks so it works offline.
- **Governing metrics** — live readings of the eight Part IV metrics with threshold status; unmeasured inputs read "unmeasured", never a fabricated number.

### Focus board
- Now / Next / Later / Backlog / Done
- Focus Mode with Pomodoro (25/5 or 50/10)
- Templates (import / export)
- AI-powered subtask generation (requires `VITE_OPENAI_API_KEY`)
- Collapsible planning chatbot with streaming responses
- LocalStorage persistence (Supabase-backed when configured)
- MIT License

### Notion Calendar sync & task import/export
The **Sync** button in the board toolbar opens a hub for moving tasks in and
out of the studio:

- **Notion Calendar** — export every task with a due date as a standard
  iCalendar (`.ics`) file. Import it into Google Calendar (or subscribe to it)
  and it appears in [Notion Calendar](https://calendar.notion.so), which reads
  your Google calendars. Priority, status, tags, estimate, and notes travel
  along as event metadata. (Notion's REST API blocks direct browser writes via
  CORS, so the `.ics`/CSV route is the reliable, zero-setup path.)
- **Notion CSV** — export a Notion-friendly table you can import straight into
  a Notion database, then flip to a Calendar view on the Due date.
- **Import / Export** — round-trip the board as JSON (full fidelity) or CSV,
  or import pasted/uploaded JSON or CSV. Notion database CSV exports are
  auto-detected (tolerant column and status/priority mapping), with
  **Merge** (skip duplicates) or **Replace** modes.

## Data & Privacy

All task data is stored locally in your browser by default. Future
releases will offer optional end-to-end encryption and sanitized export
tools to help protect personal information.
