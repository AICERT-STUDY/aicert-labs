# Scenario 6 — Structured Data Extraction

From the CCA-F exam guide: *a system extracts information from unstructured documents, validates the output against JSON schemas, and keeps precision high while handling edge cases and integrating with downstream systems.*

The obvious version of this scenario is "use tool_use to get JSON out of Claude." That's necessary but not the actual test. The real question is what happens when the document is ambiguous — and whether the system can tell the difference between "confidently extracted" and "guessed."

Companion article: [aicert.study/blog](https://aicert.study/en/blog) (link added once published).

## Domains this maps to

| Domain | Where it shows up here |
|---|---|
| **Prompt Engineering & Structured Output** | `src/schema.ts` — a JSON Schema for the `record_extraction` tool, plus a second validation layer that checks something the JSON Schema structurally can't |
| **Context Management & Reliability** | `src/route.ts` — a validation failure or a flagged field never reaches auto-processing; it fails safe to human review instead |

## tool_use enforces shape. It can't enforce honesty.

`EXTRACTION_TOOL_INPUT_SCHEMA` in `src/schema.ts` is a plain JSON Schema: `vendor` is `string | null`, `fieldsNeedingReview` is an array of field names. Handing that to Claude via `tool_choice` guarantees the response has that shape. It does **not** guarantee the response is internally honest — nothing in a JSON Schema can express "if `vendor` is `null`, `\"vendor\"` must appear in `fieldsNeedingReview`." That's a relationship *between* two fields, not a constraint on either one alone, and plain JSON Schema has no way to say it.

`ExtractionSchema` in the same file adds that check with zod's `superRefine`: any nullable field that's `null` but *not* listed in `fieldsNeedingReview` fails validation. This is the one thing this scenario is actually testing — not whether you can call a tool with a schema, but whether you know a schema alone doesn't stop a model from returning a confident-looking `null` that it never flagged as uncertain.

## What happens when the invariant is violated: fail safe, not silent-fail

`src/route.ts` only allows `auto_process` when validation succeeded **and** `fieldsNeedingReview` is empty. Two distinct failure modes both route to `human_review`:

- The extraction is well-formed but has flagged fields (the honest, expected case for an ambiguous document).
- The extraction violates the invariant, or doesn't parse at all (the model made an internally inconsistent claim, or produced something malformed).

Critically, an invariant violation returns `result: null` to the caller — the routing layer doesn't try to salvage or partially trust a self-contradictory extraction. This is the same "degrade to the safe state, don't propagate a broken value" instinct as [Scenario 5's malformed-finding handling](/certifications/ccaf), applied where the cost of guessing wrong is a downstream system silently acting on bad data instead of a missed PR comment.

## The three fixtures are deliberately different failure shapes

- `invoice-clean.txt` — everything is unambiguous. Should extract cleanly with an empty `fieldsNeedingReview` and route to `auto_process`.
- `invoice-ambiguous.txt` — a date format that could be two different days (`03/04/2026`), an illegible vendor, no currency symbol anywhere. Should flag multiple fields and route to `human_review`.
- `invoice-multi-currency.txt` — line items in inconsistent currencies and an explicit "see final settlement invoice" instead of a total. Tests whether the model flags `totalAmount` and `currency` rather than picking one currency arbitrarily or summing mismatched units into a number that looks fine but means nothing.

## Run it yourself

```bash
git clone https://github.com/AICERT-STUDY/aicert-labs
cd aicert-labs/cca-f/scenario-6-structured-data-extraction
npm install
npm test    # 8 passing tests covering the invariant and the fail-safe routing

cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run extract -- fixtures/invoice-ambiguous.txt
```

`npm test` alone fully exercises the invariant and the routing fail-safe without needing an API key — that's the part worth understanding first. `npm run extract` is the live end-to-end path.

## What to try changing

- Feed `invoice-multi-currency.txt` through and check whether `currency` actually gets flagged — real models don't always catch this reliably on the first try, which is itself a useful demonstration of why the code-level invariant matters more than prompt wording alone.
- Remove the `superRefine` check from `ExtractionSchema` and re-run the test suite — watch `route.test.ts`'s "fails safe" test start failing, since nothing would catch the null-but-unflagged case anymore.
- Add a per-line-item currency field to handle `invoice-multi-currency.txt`'s actual root cause (currency varies *within* the document, not just at the document level) instead of only flagging the document-level field.
