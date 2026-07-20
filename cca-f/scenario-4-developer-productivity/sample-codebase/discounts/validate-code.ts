import { lookupLegacyPromo } from "./legacy-promo-engine.js";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateDiscountCode(code: string, cartTotalUsd: number): ValidationResult {
  if (code.startsWith("LEGACY-")) {
    // Old promo system, kept alive because a handful of active codes from a
    // 2021 campaign still work this way. See legacy-promo-engine.ts.
    return lookupLegacyPromo(code, cartTotalUsd);
  }
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return { valid: false, reason: "malformed_code" };
  }
  if (cartTotalUsd < 20) {
    return { valid: false, reason: "cart_below_minimum" };
  }
  return { valid: true };
}
