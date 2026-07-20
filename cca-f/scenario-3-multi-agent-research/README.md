# Scenario 3 — Multi-Agent Research System

From the CCA-F exam guide: *a coordinator agent delegates to specialized subagents (search, document analysis, synthesis, report generation) to produce cited, comprehensive reports.*

This is a working orchestrator/subagent implementation over a small mock document corpus — six sources on 4-day work week research, deliberately including ones that disagree with each other, so synthesis has to reconcile sources rather than just concatenate them.

Companion article: [aicert.study/blog](https://aicert.study/en/blog) (link added once published).

## Domains this maps to

| Domain | Where it shows up here |
|---|---|
| **Agentic Architecture & Orchestration** | `src/coordinator.ts` — plans subtopics, runs one research subagent per subtopic, then a synthesis pass |
| **Tool Design & MCP Integration** | `src/mcp-server.ts` exposes `search_documents` and `get_document` as two separate tools, not one — see below |
| **Context Management & Reliability** | `src/researcher.ts` returns a compact `SubtopicResearch` object, never its own message history. The coordinator's context grows with the number of subtopics, not with how many documents each subagent read along the way |

## Why the coordinator never sees a subagent's transcript

The naive version of this architecture has the coordinator hold one long conversation, calling tools directly for every subtopic. That conversation's context grows with *everything* — every search query, every document read (including the ones that turned out irrelevant), for every subtopic, all in one place. By the third or fourth subtopic, the coordinator's context is dominated by search noise, not by the findings that actually matter for the final report.

`researchSubtopic()` in `src/researcher.ts` runs its own bounded, disposable conversation per subtopic and returns *only* `{ subtopic, findings: [{ claim, documentId, source }] }` — a handful of structured facts. The coordinator (`src/coordinator.ts`) accumulates those compact results, not transcripts. Whether a subagent needed 2 tool calls or 6 to find its findings is invisible to the coordinator and to the final report — and that's the point. It's the same "quarantine the noisy part" instinct as Scenario 1's typed `needs_escalation` result: keep the caller's context proportional to what it actually needs to decide the next step.

## Why two tools instead of one (`search_documents` + `get_document`)

A single `search_and_return_full_text(query)` tool would be simpler to call, but it means every hit's full text lands in context whether or not the subagent ends up citing it. Splitting into a cheap search (compact hits: id, title, source, snippet) and an explicit fetch (full text, one document at a time) makes the subagent's own tool-design decisions visible: it has to choose what's worth reading in full, instead of getting everything by default. `get_document`'s description also explicitly tells the subagent snippets aren't safe to cite — the tool boundary enforces a citation-quality rule the way `process_refund` (Scenario 1) enforces a business rule, instead of leaving it to a system-prompt aside.

## Run it yourself

```bash
git clone https://github.com/AICERT-STUDY/aicert-labs
cd aicert-labs/cca-f/scenario-3-multi-agent-research
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY

npm run research -- "Does a 4-day work week actually work?"
```

Watch the console: the coordinator plans subtopics, each researcher subagent logs how many findings it recorded (not what it searched for or read — that's intentionally invisible from here), and the final report cites every claim as `[doc_id]`.

`npm run research` spawns `src/mcp-server.ts` itself; run `npm run server` if you want to inspect the server on its own.

## What to try changing

- The coordinator runs research subagents sequentially, in a `for` loop, so the console log stays readable. Since each `researchSubtopic()` call is independent, swap it for `Promise.all(subtopics.map(...))` and watch it run concurrently — nothing else has to change, because the subagents don't share state.
- Add a document that flatly contradicts `doc_01` (e.g. a pilot that measured a revenue *drop*) and re-run. Check whether the synthesis step's "Where sources disagree" section actually catches it — if it doesn't, that's a prompt worth tightening, not a code bug.
- Remove the `get_document` tool and let subagents cite straight from `search_documents` snippets. Compare citation quality — this is the fastest way to feel why the two-tool split exists.
