// Metadata a generic Read/Grep tool structurally cannot produce, no matter
// how the agent uses it — it doesn't live in the file's text. Standing in for
// what a real version would pull from `git log`, a CODEOWNERS file, and a
// test-coverage index. This is the case for the custom MCP tools below.

export interface FileHistoryEntry {
  author: string;
  date: string;
  message: string;
}

const HISTORY: Record<string, FileHistoryEntry[]> = {
  "discounts/legacy-promo-engine.ts": [
    { author: "priya.nair", date: "2021-11-03", message: "Add VIP tier for fall campaign" },
    { author: "sam.reyes", date: "2021-09-14", message: "Initial legacy promo table" },
  ],
  "discounts/validate-code.ts": [
    { author: "jamie.ortiz", date: "2024-02-20", message: "Route LEGACY- codes to legacy engine" },
    { author: "jamie.ortiz", date: "2023-06-01", message: "Add cart minimum check" },
  ],
  "discounts/apply-discount.ts": [
    { author: "jamie.ortiz", date: "2024-02-20", message: "Support flat-percent legacy discounts" },
  ],
};

const OWNERS: Record<string, string> = {
  "discounts/legacy-promo-engine.ts": "no active owner — original authors (priya.nair, sam.reyes) left the team in 2022; escalate to #platform-oncall",
  "discounts/validate-code.ts": "jamie.ortiz (#billing-team)",
  "discounts/apply-discount.ts": "jamie.ortiz (#billing-team)",
};

const RELATED_TESTS: Record<string, string[]> = {
  "discounts/validate-code.ts": ["discounts/__tests__/validate-code.test.ts"],
  "discounts/apply-discount.ts": [], // no direct test coverage — worth flagging to whoever's exploring this
  "discounts/legacy-promo-engine.ts": [], // no direct test coverage
};

export function getFileHistory(path: string): FileHistoryEntry[] | undefined {
  return HISTORY[path];
}

export function findOwner(path: string): string | undefined {
  return OWNERS[path];
}

export function findRelatedTests(path: string): string[] | undefined {
  return RELATED_TESTS[path];
}
