import { formatCurrency } from "../shared/format-currency.js";

export function renderRefundConfirmation(orderId: string, amountUsd: number): string {
  return `Refunded ${formatCurrency(amountUsd)} for order ${orderId}.`;
}
