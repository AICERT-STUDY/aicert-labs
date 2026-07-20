import type { Finding } from "./types.js";

const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  bug: "🔴 Bug",
  risk: "🟡 Risk",
  nitpick: "⚪️ Nitpick", // never actually reaches this formatter — see filter-findings.ts
};

export function formatComment(finding: Finding): string {
  return [
    `**${SEVERITY_LABEL[finding.severity]}** (confidence: ${Math.round(finding.confidence * 100)}%)`,
    "",
    finding.summary,
    "",
    `**Failure scenario:** ${finding.failureScenario}`,
  ].join("\n");
}

export interface GitHubReviewComment {
  path: string;
  line: number;
  body: string;
}

export function toGitHubReviewComments(findings: Finding[]): GitHubReviewComment[] {
  return findings.map((finding) => ({
    path: finding.file,
    line: finding.line,
    body: formatComment(finding),
  }));
}
