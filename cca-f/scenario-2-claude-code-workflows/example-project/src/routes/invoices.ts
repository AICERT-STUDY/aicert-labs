import { formatCurrency } from "../shared/format-currency.js";

export function renderInvoiceLine(itemDescription: string, amountUsd: number): string {
  return `${itemDescription} — ${formatCurrency(amountUsd)}`;
}
