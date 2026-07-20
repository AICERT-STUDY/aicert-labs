# billing-service — team conventions for Claude Code

This file is context every session starts with. Keep it short enough that it's actually read — long, stale CLAUDE.md files are a Context Management failure, not a safety net.

## Stack
TypeScript, Express, Postgres via Prisma. Tests: `npm test` (Vitest). Lint: `npm run lint`.

## Before you finish any task
1. Run `npm test` and `npm run lint`. Don't report a task done if either fails.
2. Don't touch `src/legacy/` unless the task explicitly asks for it — it has no test coverage and three other services depend on its current (undocumented) behavior.

## Plan mode vs. direct execution — this is the part that matters

Blast radius decides the mode, not task difficulty. A one-line fix can still need plan mode if it's in a shared module.

| Change touches... | Mode |
|---|---|
| A single file, not imported anywhere else (e.g. a new endpoint handler) | Direct execution is fine |
| A file imported by 3+ other modules, or anything under `src/shared/` | **Plan mode required** — propose the change, wait for approval, then execute |
| `src/legacy/` | **Plan mode required**, and the plan must call out what you *didn't* verify (no tests exist) |
| Database schema / migrations | **Plan mode required**, always, no exceptions |

The custom commands below encode this table directly instead of relying on the model (or a human) re-deriving it every session — see the repo README for why that's the actual design decision worth studying here.

## Commit style
Conventional Commits. Reference the ticket number if one exists in the task description.
