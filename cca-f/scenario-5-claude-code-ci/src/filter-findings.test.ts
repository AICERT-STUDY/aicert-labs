import { describe, it, expect } from "vitest";
import { filterFindings, MIN_CONFIDENCE } from "./filter-findings.js";
import type { Finding } from "./types.js";

function finding(overrides: Partial<Finding>): Finding {
  return {
    file: "src/example.ts",
    line: 1,
    failureScenario: "some concrete scenario",
    confidence: 0.9,
    severity: "bug",
    summary: "summary",
    ...overrides,
  };
}

describe("filterFindings", () => {
  it("posts a high-confidence bug", () => {
    const { posted, suppressed } = filterFindings([finding({ severity: "bug", confidence: 0.9 })]);
    expect(posted).toHaveLength(1);
    expect(suppressed).toHaveLength(0);
  });

  it("suppresses a nitpick regardless of confidence", () => {
    const { posted, suppressed } = filterFindings([finding({ severity: "nitpick", confidence: 0.99 })]);
    expect(posted).toHaveLength(0);
    expect(suppressed).toHaveLength(1);
  });

  it("suppresses a bug below the confidence threshold", () => {
    const { posted, suppressed } = filterFindings([finding({ severity: "risk", confidence: MIN_CONFIDENCE - 0.01 })]);
    expect(posted).toHaveLength(0);
    expect(suppressed).toHaveLength(1);
  });

  it("posts a risk exactly at the confidence threshold", () => {
    const { posted } = filterFindings([finding({ severity: "risk", confidence: MIN_CONFIDENCE })]);
    expect(posted).toHaveLength(1);
  });
});
