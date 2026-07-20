---
description: Generate or update docs/comments for a file. Direct execution, low risk.
argument-hint: <file path>
---

Write or update documentation for $ARGUMENTS: a short module-level comment explaining *why* the module exists (not what each line does), and JSDoc for any exported function whose behavior isn't obvious from its name and types.

Do not touch any logic in this file — if you notice a bug while documenting, report it to the user instead of fixing it (that's `/fix-bug`'s job, and mixing the two in one diff makes review harder).
