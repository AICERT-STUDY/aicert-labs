import { validateDiscountCode } from "./validate-code.js";

export function applyDiscount(code: string, cartTotalUsd: number): number {
  const result = validateDiscountCode(code, cartTotalUsd);
  if (!result.valid) return cartTotalUsd;

  if (code.startsWith("LEGACY-")) {
    // Legacy codes are flat-percent, applied before any current-system logic.
    const percentOff = code === "LEGACY-VIP" ? 25 : 15;
    return cartTotalUsd * (1 - percentOff / 100);
  }

  // Current-system codes are a flat $5 off — deliberately simple for this example.
  return Math.max(0, cartTotalUsd - 5);
}
