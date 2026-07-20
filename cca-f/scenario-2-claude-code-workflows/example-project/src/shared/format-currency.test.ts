import { describe, it, expect } from "vitest";
import { formatCurrency } from "./format-currency.js";

describe("formatCurrency", () => {
  it("formats a positive amount as USD", () => {
    expect(formatCurrency(79)).toBe("$79.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});
