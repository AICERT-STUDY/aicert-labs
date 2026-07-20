import { describe, it, expect } from "vitest";
import { ExtractionSchema } from "./schema.js";

const BASE = { lineItems: [{ description: "item", amount: 10 }] };

describe("ExtractionSchema invariant", () => {
  it("accepts a fully-determined extraction with nothing flagged", () => {
    const result = ExtractionSchema.safeParse({
      ...BASE,
      vendor: "Acme Corp",
      invoiceDate: "2026-03-14",
      currency: "USD",
      totalAmount: 10,
      fieldsNeedingReview: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null field that IS listed in fieldsNeedingReview", () => {
    const result = ExtractionSchema.safeParse({
      ...BASE,
      vendor: null,
      invoiceDate: "2026-03-14",
      currency: "USD",
      totalAmount: 10,
      fieldsNeedingReview: ["vendor"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a null field that is NOT listed in fieldsNeedingReview", () => {
    const result = ExtractionSchema.safeParse({
      ...BASE,
      vendor: null,
      invoiceDate: "2026-03-14",
      currency: "USD",
      totalAmount: 10,
      fieldsNeedingReview: [], // vendor is null but not flagged — the invariant this schema exists to catch
    });
    expect(result.success).toBe(false);
  });

  it("rejects a value present in fieldsNeedingReview referencing an unknown field name", () => {
    const result = ExtractionSchema.safeParse({
      ...BASE,
      vendor: "Acme Corp",
      invoiceDate: "2026-03-14",
      currency: "USD",
      totalAmount: 10,
      fieldsNeedingReview: ["not_a_real_field"],
    });
    expect(result.success).toBe(false);
  });
});
