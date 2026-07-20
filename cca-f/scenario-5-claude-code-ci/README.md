# Scenario 5 — Claude Code for Continuous Integration

From the CCA-F exam guide: *Claude Code integrated into the CI/CD pipeline: automated code review, generation of test cases, and feedback on pull requests, minimizing false positives.*

The exam guide's own phrasing names the hard part: "minimizing false positives." This scenario is a working GitHub Actions workflow plus a small TypeScript layer that's specifically about that phrase, not about wiring Claude Code into CI (which is the easy part).

Companion article: [aicert.study/blog](https://aicert.study/en/blog) (link added once published).

## Domains this maps to

| Domain | Where it shows up here |
|---|---|
| **Claude Code Configuration & Workflows** | `.github/workflows/claude-review.yml` — headless invocation, permissions, and where the CLI's output feeds the next step |
| **Prompt Engineering & Structured Output** | `prompts/review-prompt.md` (asks for a confidence score and a concrete failure scenario, not a vibe) plus `src/types.ts` (a zod schema that validates — and can reject — what the model wrote) |

## Minimizing false positives is a threshold, not a prompt instruction

It's tempting to think "minimize false positives" is solved entirely in the prompt — tell the model to only flag things it's confident about, be conservative, don't nitpick. That helps, and `prompts/review-prompt.md` does ask for a confidence score and a specific failure scenario instead of a vague concern. But a prompt instruction is still just a request the model can miscalibrate on any given run — a false positive doesn't have to happen often to train a team to stop reading the bot's comments at all.

The actual gate is `src/filter-findings.ts`: a fixed `MIN_CONFIDENCE = 0.7` threshold, and severity `"nitpick"` is filtered out unconditionally regardless of confidence. This is not the model deciding what's worth posting — that decision already happened once, in the prompt, and this is a second, independent check that doesn't depend on that first one having gone well. It's the same shape as [Scenario 1's `process_refund`](/certifications/ccaf): ask nicely in the prompt, then enforce for real in code.

## The pipeline degrades instead of failing

`post-review-comments.ts` validates every finding against the same zod schema Claude Code was asked to follow — but if one entry is malformed (a missing field, a confidence outside 0–1), that single entry is logged and dropped, not treated as a reason to abort the whole review. A CI check that crashes because the model produced one slightly malformed JSON object is worse than one that posts three valid findings and skips a fourth. This mirrors [Scenario 3's coordinator](/certifications/ccaf): treat a partial, structurally-invalid result as an expected case to handle, not an exception to propagate.

## Run it yourself

```bash
git clone https://github.com/AICERT-STUDY/aicert-labs
cd aicert-labs/cca-f/scenario-5-claude-code-ci
npm install
npm test    # 5 passing tests on the filter/format logic

# Dry run against a fixture with 4 findings — 2 should pass the bar, 2 shouldn't:
npm run post -- fixtures/sample-findings.json
```

Without `GITHUB_TOKEN`/`GITHUB_REPOSITORY`/`PR_NUMBER` set, `npm run post` prints what it would have posted instead of calling the GitHub API — that's what lets you verify the filtering logic without a real PR. `.github/workflows/claude-review.yml` shows the full pipeline as it would run in CI; check the current [Claude Code docs](https://docs.claude.com/claude-code) for the exact headless-mode flags before using it for real — CLI flags change more often than the architecture decision this scenario is actually testing.

## What to try changing

- Lower `MIN_CONFIDENCE` to 0.5 and re-run against the fixture — watch the "risk" finding about `percentOff` (35% confidence) start getting posted, and judge for yourself whether that's actually a finding worth a PR comment.
- The workflow posts one summary comment rather than inline per-line review comments (which need a diff `position`, not just a file/line — a genuinely fiddlier GitHub API call). Try extending `format-comments.ts` to compute diff positions and post real inline review comments instead.
