// Imported by src/routes/invoices.ts, src/routes/refunds.ts, and
// src/routes/reports.ts — this is exactly the kind of file CLAUDE.md's
// blast-radius table means by "imported by 3+ other modules": a bug here
// breaks three routes at once, so it goes through /refactor-safely, not
// /fix-bug, even for a one-line change.
export function formatCurrency(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountUsd);
}
