# Scenario 4 — Developer Productivity with Claude

From the CCA-F exam guide: *an agent helps engineers explore unfamiliar codebases, understand legacy systems, and automate repetitive tasks using built-in tools (Read, Write, Bash, Grep, Glob) and MCP servers.*

This standalone script doesn't run inside Claude Code, so it can't use Claude Code's actual built-ins — instead, `src/local-tools.ts` implements generic equivalents (`read_file`, `grep_codebase`, `list_files`), and `src/mcp-server.ts` adds three tools that answer questions those generic tools structurally cannot. The example target is a small fictional "legacy" discount-code module — the kind of code an engineer might land on for the first time and need to understand fast.

Companion article: [aicert.study/blog](https://aicert.study/en/blog) (link added once published).

## Domains this maps to

| Domain | Where it shows up here |
|---|---|
| **Tool Design & MCP Integration** | Which tools are generic (`local-tools.ts`) versus custom-built for this domain (`mcp-server.ts`) — and why |
| **Claude Code Configuration & Workflows** | This mirrors Claude Code's actual built-in/MCP split, just implemented explicitly since this script runs outside Claude Code |
| **Agentic Architecture & Orchestration** | `src/agent.ts` — one loop, two tool sources, a system prompt that tells the model which kind to reach for and when |

## Why three custom tools and not more

`get_file_history`, `find_owner`, and `find_related_tests` all answer questions that are **not derivable from the file's own text**, no matter how good the generic `read_file`/`grep_codebase` tools are. Why a file looks the way it does, who to actually contact about it, and whether it has test coverage — none of that lives inside the file. That's the line this scenario is testing: a custom MCP tool is justified when the information genuinely isn't reachable by more file reading, not just when a general tool feels slow.

The inverse mistake is just as real — building a custom `read_discount_validation_logic` tool that's really just `read_file` with a narrower name. If a generic tool can already answer the question given enough calls, adding a bespoke one is duplicated surface area to maintain, not better tool design.

## The example is deliberately a trap

`discounts/legacy-promo-engine.ts` has no comment explaining *why* `LEGACY-` codes route through a separate table — you only get that from `get_file_history` (a 2021 campaign) and `find_owner` (the original authors left the team; escalate to `#platform-oncall`). `discounts/apply-discount.ts` has real logic and zero test coverage, which `find_related_tests` surfaces as an empty list rather than an error — an agent that only used `read_file`/`grep_codebase` could describe what the code does without ever surfacing that it's unguarded by tests, which is exactly the kind of gap this scenario is testing whether an agent will flag.

## Run it yourself

```bash
git clone https://github.com/AICERT-STUDY/aicert-labs
cd aicert-labs/cca-f/scenario-4-developer-productivity
npm install && npm test    # 3 passing tests, discovered inside sample-codebase/
cp .env.example .env       # add your ANTHROPIC_API_KEY

npm run agent -- "How do LEGACY- discount codes work, and who do I ask if one misbehaves?"
```

Watch which tool it reaches for at each step — reading/grepping to understand the *what*, then `get_file_history`/`find_owner` for the *why* and *who*, ideally before ever making a claim about risk or ownership.

## What to try changing

- Ask a question that only needs generic tools (e.g. "what does `applyDiscount` return for a cart with no code?") and see whether the agent still reaches for the MCP tools unnecessarily — if it does, that's a system-prompt tuning problem, not a tool-design one.
- Add a fourth MCP tool that's redundant with `grep_codebase` (e.g. `find_function_definition(name)` implemented as a grep under the hood) and see whether its presence changes which tool gets picked — a good way to feel why the "don't duplicate a generic tool" rule matters in practice, not just in theory.
