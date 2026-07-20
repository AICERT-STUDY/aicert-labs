---
description: Fix a scoped, single-file bug. Direct execution — do not enter plan mode for this command.
argument-hint: <file path> <bug description>
---

Fix the following bug in $ARGUMENTS.

Rules for this command specifically:
- This is a direct-execution command. Per CLAUDE.md's blast-radius table, only use it when the fix is confined to the one file given — if fixing the bug correctly requires touching a file imported by other modules, `src/shared/`, or `src/legacy/`, stop and tell the user to run `/refactor-safely` instead.
- Add or update a test that reproduces the bug and would have failed before your fix.
- Run `npm test` and `npm run lint` before reporting done, per CLAUDE.md.
