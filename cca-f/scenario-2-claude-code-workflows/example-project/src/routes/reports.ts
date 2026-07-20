import { formatCurrency } from "../shared/format-currency.js";

export function renderMonthlyTotal(totalUsd: number): string {
  return `Monthly total: ${formatCurrency(totalUsd)}`;
}
