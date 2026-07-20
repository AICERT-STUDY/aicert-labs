import { describe, it, expect } from "vitest";
import { validateDiscountCode } from "../validate-code.js";

describe("validateDiscountCode", () => {
  it("rejects malformed codes", () => {
    expect(validateDiscountCode("bad code!", 50).valid).toBe(false);
  });

  it("accepts a well-formed code above the cart minimum", () => {
    expect(validateDiscountCode("SAVE10NOW", 25).valid).toBe(true);
  });

  it("honors a legacy code independent of the current minimum", () => {
    expect(validateDiscountCode("LEGACY-FALL21", 5).valid).toBe(true);
  });
});
