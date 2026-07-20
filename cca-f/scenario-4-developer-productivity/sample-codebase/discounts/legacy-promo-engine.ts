import type { ValidationResult } from "./validate-code.js";

// Everyone on the current team avoids touching this file. It predates the
// current discount system and only still exists because a 2021 campaign's
// codes (LEGACY-*) are still redeemable per a support commitment made at the
// time. Nobody currently on the team wrote this — see the ownership and
// history tools for who to actually ask.
const LEGACY_PROMO_TABLE: Record<string, { percentOff: number; minCartUsd: number }> = {
  "LEGACY-FALL21": { percentOff: 15, minCartUsd: 0 },
  "LEGACY-VIP": { percentOff: 25, minCartUsd: 50 },
};

export function lookupLegacyPromo(code: string, cartTotalUsd: number): ValidationResult {
  const promo = LEGACY_PROMO_TABLE[code];
  if (!promo) return { valid: false, reason: "unknown_legacy_code" };
  if (cartTotalUsd < promo.minCartUsd) return { valid: false, reason: "cart_below_minimum" };
  return { valid: true };
}
