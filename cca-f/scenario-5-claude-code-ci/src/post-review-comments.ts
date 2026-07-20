// CLI entrypoint the CI workflow runs after Claude Code produces its
// findings JSON. Validates the raw output (dropping malformed entries
// instead of failing the whole run), filters by confidence/severity, and
// either posts a summary comment to the PR or, without GITHUB_TOKEN set
// (e.g. running locally), prints what it would have posted.
//
// Usage: npm run post -- fixtures/sample-findings.json

import { readFileSync } from "node:fs";
import { z } from "zod";
import { FindingSchema, type Finding } from "./types.js";
import { filterFindings, MIN_CONFIDENCE } from "./filter-findings.js";
import { formatComment } from "./format-comments.js";

function loadFindings(path: string): Finding[] {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const arraySchema = z.array(z.unknown());
  const entries = arraySchema.parse(raw);

  const findings: Finding[] = [];
  for (const [i, entry] of entries.entries()) {
    const result = FindingSchema.safeParse(entry);
    if (result.success) {
      findings.push(result.data);
    } else {
      // A malformed finding shouldn't take down the whole review run — log
      // and skip it instead. This is the same "degrade, don't crash"
      // instinct as Scenario 1's typed needs_escalation result: one bad
      // entry from the model is an expected failure mode, not an exception.
      console.warn(`Skipping findings[${i}]: ${result.error.issues.map((iss) => iss.message).join(", ")}`);
    }
  }
  return findings;
}

function buildSummaryComment(posted: Finding[], suppressedCount: number): string {
  if (posted.length === 0) {
    return suppressedCount > 0
      ? `**Claude Code review:** no findings met the confidence/severity bar to post (${suppressedCount} suppressed as low-confidence or nitpick).`
      : "**Claude Code review:** no issues found.";
  }
  const body = posted.map((f) => `### ${f.file}:${f.line}\n\n${formatComment(f)}`).join("\n\n---\n\n");
  return `**Claude Code review** — ${posted.length} finding(s) (${suppressedCount} suppressed as low-confidence or nitpick):\n\n${body}`;
}

async function postToGitHub(comment: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
  const prNumber = process.env.PR_NUMBER;

  if (!token || !repo || !prNumber) {
    console.log("\n[dry run — GITHUB_TOKEN/GITHUB_REPOSITORY/PR_NUMBER not all set]\n");
    console.log(comment);
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: comment }),
  });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${await response.text()}`);
  }
  console.log("Posted review comment to PR.");
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run post -- <findings.json>");
    process.exit(1);
  }

  const findings = loadFindings(path);
  const { posted, suppressed } = filterFindings(findings);

  console.log(
    `${findings.length} raw finding(s) -> ${posted.length} posted, ${suppressed.length} suppressed (confidence < ${MIN_CONFIDENCE} or nitpick).`
  );
  for (const f of suppressed) {
    console.log(`  suppressed: [${f.severity}, ${Math.round(f.confidence * 100)}%] ${f.file}:${f.line} — ${f.summary}`);
  }

  await postToGitHub(buildSummaryComment(posted, suppressed.length));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
