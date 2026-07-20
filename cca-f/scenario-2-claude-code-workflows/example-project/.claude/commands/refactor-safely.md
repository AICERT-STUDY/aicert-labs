---
description: Refactor a shared module, src/shared/ file, or anything in src/legacy/. Requires plan mode.
argument-hint: <file or module path> <what to change and why>
---

Refactor $ARGUMENTS.

This command is for changes CLAUDE.md's blast-radius table marks as plan-mode-required (shared modules, `src/shared/`, `src/legacy/`, schema changes). Before writing any code:

1. Enumerate every file that imports the module you're changing (`grep`/`Grep` for the import, don't guess).
2. Present a plan: what changes, what doesn't, and — if this touches `src/legacy/` — an explicit list of behaviors you could not verify because no tests exist for that code.
3. Wait for the plan to be approved before executing.
4. After executing, run `npm test` and `npm run lint`, and re-check every file you enumerated in step 1 for breakage the type checker wouldn't catch (e.g. a changed runtime contract, not just a changed type).

If you were invoked without plan mode enabled, tell the user to re-run this command in plan mode rather than proceeding directly — that's the whole point of this command existing separately from `/fix-bug`.
