import { describe, it, expect } from "vitest";
import { route } from "./route.js";
import { validateExtraction } from "./validate.js";

const CLEAN = {
  vendor: "Acme Corp",
  invoiceDate: "2026-03-14",
  currency: "USD",
  lineItems: [{ description: "item", amount: 10 }],
  totalAmount: 10,
  fieldsNeedingReview: [],
};

describe("route", () => {
  it("auto-processes a fully-determined, valid extraction", () => {
    const decision = route(validateExtraction(CLEAN));
    expect(decision.action).toBe("auto_process");
  });

  it("routes to human review when fields are flagged", () => {
    const decision = route(validateExtraction({ ...CLEAN, vendor: null, fieldsNeedingReview: ["vendor"] }));
    expect(decision.action).toBe("human_review");
    if (decision.action === "human_review") expect(decision.reason).toContain("vendor");
  });

  it("fails safe to human review (with no result) when the raw extraction violates the schema invariant", () => {
    // vendor is null but not flagged — exactly the case ExtractionSchema's
    // superRefine is built to catch. This must never end up auto_process.
    const decision = route(validateExtraction({ ...CLEAN, vendor: null, fieldsNeedingReview: [] }));
    expect(decision.action).toBe("human_review");
    if (decision.action === "human_review") expect(decision.result).toBeNull();
  });

  it("fails safe to human review when the raw input isn't even the right shape", () => {
    const decision = route(validateExtraction({ garbage: true }));
    expect(decision.action).toBe("human_review");
  });
});
