import type { Finding } from "./types.js";

// This threshold — not another prompt instruction asking the model to "only
// report it if you're really sure" — is what actually keeps false positives
// off pull requests. See the README for why that distinction is the point
// of this whole scenario.
export const MIN_CONFIDENCE = 0.7;

export interface FilterResult {
  posted: Finding[];
  suppressed: Finding[];
}

export function filterFindings(findings: Finding[]): FilterResult {
  const posted: Finding[] = [];
  const suppressed: Finding[] = [];

  for (const finding of findings) {
    const meetsBar = finding.severity !== "nitpick" && finding.confidence >= MIN_CONFIDENCE;
    (meetsBar ? posted : suppressed).push(finding);
  }

  return { posted, suppressed };
}
