import { describe, it, expect } from "vitest";
import { toGitHubReviewComments } from "./format-comments.js";
import type { Finding } from "./types.js";

describe("toGitHubReviewComments", () => {
  it("maps a finding to a path/line/body comment", () => {
    const finding: Finding = {
      file: "src/discounts/apply-discount.ts",
      line: 12,
      failureScenario: "empty cart gets a $5 discount",
      confidence: 0.82,
      severity: "bug",
      summary: "Discount applies to an empty cart.",
    };
    const [comment] = toGitHubReviewComments([finding]);
    expect(comment.path).toBe("src/discounts/apply-discount.ts");
    expect(comment.line).toBe(12);
    expect(comment.body).toContain("82%");
    expect(comment.body).toContain("empty cart gets a $5 discount");
  });
});
