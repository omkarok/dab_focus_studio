# Focus Studio Starter (React + Tailwind)

Minimal, open-source focus dashboard starter.

## Quickstart
```bash
npm i
npm run dev
```

Optionally set `VITE_OPENAI_API_KEY` (and `VITE_OPENAI_MODEL`, default `gpt-4o-mini`) to enable AI-powered subtasks and the planning chatbot. If you have an AI Grants India key, supply it via `VITE_OPENAI_API_KEY`.

## Features
- Now / Next / Later / Backlog / Done
- Focus Mode with Pomodoro (25/5 or 50/10)
- Templates (import / export)
- AI-powered subtask generation (requires `VITE_OPENAI_API_KEY`)
- Collapsible planning chatbot with streaming responses
- LocalStorage persistence
- MIT License

## Data & Privacy

All task data is stored locally in your browser by default. Future
releases will offer optional end-to-end encryption and sanitized export
tools to help protect personal information.
