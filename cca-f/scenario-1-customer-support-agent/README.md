# Scenario 1 — Customer Support Resolution Agent

From the CCA-F exam guide: *a support agent built on the Claude Agent SDK handles returns, billing disputes, and account questions through custom MCP tools (`get_customer`, `process_refund`, `escalate_to_human`), targeting 80%+ first-contact resolution.*

This folder is a minimal, runnable version of exactly that — small enough to read end to end in a few minutes, but with the same architectural decisions the exam scenario is testing.

Companion article: [aicert.study/blog](https://aicert.study/en/blog) (link added once published).

## Domains this maps to

| Domain | Where it shows up here |
|---|---|
| **Agentic Architecture & Orchestration** | `src/agent.ts` — the loop that lets Claude call tools, reads their structured results, and decides whether to keep going or hand off |
| **Tool Design & MCP Integration** | `src/mcp-server.ts` — three tools with a real MCP server, not just three functions. Notice `process_refund` never throws a generic error for "amount too high"; it returns a typed `needs_escalation` result the agent can branch on |
| **Context Management & Reliability** | The system prompt and `MAX_AGENT_TURNS` cap in `agent.ts` — a support agent that can loop forever calling the same tool is a reliability bug, not a feature |

## Why `process_refund` doesn't just do the refund

This is the one design decision worth studying closely. A naive tool would be `process_refund(orderId, amount)` and let the agent's system prompt say "only refund under $100." That's fragile — it depends on the model reading and obeying prose instructions every single call, with no enforcement.

Instead, the tool itself owns the business rule (`AUTO_APPROVE_LIMIT_USD`, `REPEAT_REFUND_ESCALATION_THRESHOLD` in `src/mock-crm.ts`) and returns a *typed signal* — `{ needs_escalation: true, reasonCode: ... }` — instead of silently refunding or throwing a generic error. The agent's job becomes trivial and hard to get wrong: see `needs_escalation`, call `escalate_to_human`. This is the difference between "prompting an agent to be safe" and "designing a tool that can't be used unsafely" — the kind of judgment CCA-F is scoring.

## Run it

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY

# auto-approved refund (order total is under the $100 limit)
npm run agent -- cust_1001 ord_9001 "the keyboard arrived with a broken key"

# forces an escalation (order total is over the limit)
npm run agent -- cust_1002 ord_9002 "these headphones stopped charging after a week"
```

`npm run agent` spawns `src/mcp-server.ts` itself over stdio — you don't need to run the server separately. If you want to poke at the server on its own (e.g. with the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)), run `npm run server`.

## What to try changing

- Lower `AUTO_APPROVE_LIMIT_USD` in `mock-crm.ts` to $50 and re-run the first command — watch the agent escalate instead of refunding, with zero changes to `agent.ts` or the system prompt.
- Add a fourth mock customer with `priorRefunds: 2` and request a small, normally auto-approvable refund — see the repeat-refund rule kick in.
- Remove the `needs_escalation` structured field and replace it with a plain error string. Re-run and watch the agent either retry the tool or misreport the outcome to the customer — this is the failure mode the typed result exists to prevent.
