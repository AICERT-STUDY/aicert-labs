# Scenario 2 — Code Generation with Claude Code

From the CCA-F exam guide: *a team uses Claude Code for code generation, refactoring, debugging, and documentation, with custom slash commands and a `CLAUDE.md`, deciding between plan mode and direct execution.*

`example-project/` is a small (but real, runnable) TypeScript service with a `.claude/` configuration built around one question every team using Claude Code eventually has to answer: **when does a change require plan mode, and when is direct execution fine?**

Companion article: [aicert.study/blog](https://aicert.study/en/blog) (link added once published).

## Domains this maps to

| Domain | Where it shows up here |
|---|---|
| **Claude Code Configuration & Workflows** | `example-project/CLAUDE.md` (team conventions) and `.claude/commands/` (three commands, each encoding a different risk tier) |
| **Context Management & Reliability** | `CLAUDE.md` is deliberately short — a long, stale CLAUDE.md is itself a context-management failure. The blast-radius table is the *only* thing that has to be memorized, and it's written down once instead of re-derived every session |

## The design decision worth studying

The naive version of this setup is one `CLAUDE.md` line: "always use plan mode for anything risky." That's not a decision, it's a restatement of the problem — "risky" isn't defined, so it falls back to whoever's running the session that day using their judgment (or not).

`example-project/CLAUDE.md` replaces that with an explicit table: file's blast radius (single file vs. shared module vs. legacy vs. schema) → mode. Then the three custom commands stop being generic "help me code" prompts and become the enforcement mechanism:

- **`/fix-bug`** — direct execution, but its own instructions tell it to bail into `/refactor-safely` if the fix isn't actually confined to one file.
- **`/refactor-safely`** — plan mode only. It's told explicitly to refuse to proceed without plan mode, not just to "be careful."
- **`/document`** — direct execution, and explicitly forbidden from touching logic, so a docs command can't quietly become a refactor.

`src/shared/format-currency.ts` is imported by three route files specifically so the blast-radius rule ("imported by 3+ modules → plan mode") is something you can point at, not just a hypothetical. `src/legacy/reconcile.ts` has a comment explaining exactly why it's plan-mode-required (no tests, three services depend on undocumented behavior) — the kind of tribal knowledge that's usually lost the day the person who knew it leaves the team, now written where the agent (and any new hire) will actually read it.

`.claude/settings.json` adds a second, independent layer: a `PostToolUse` hook that runs lint after every edit, and a permissions deny-list for `git push --force` and `rm -rf`. Config enforces what prompts can only request.

## Try it

```bash
cd example-project
npm install
npm test    # 2 passing tests
npm run lint
```

Open this folder in Claude Code and try the commands against the sample files:

```
/document src/shared/format-currency.ts
/fix-bug src/routes/invoices.ts the currency symbol is missing on negative amounts
/refactor-safely src/shared/format-currency.ts add support for non-USD currencies
```

Notice the third one should make Claude enumerate `invoices.ts`, `refunds.ts`, and `reports.ts` before proposing anything — that's the blast-radius table doing its job.

## What to try changing

- Delete the blast-radius table from `CLAUDE.md` and ask a generic "refactor format-currency.ts to support EUR" without the custom commands. Compare how much the result depends on the model happening to check for other importers versus the command making it structurally likely.
- Add a fourth risk tier (e.g. "touches `.env` or secrets") to the table and a matching command.
