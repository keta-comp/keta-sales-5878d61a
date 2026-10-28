// Browser-safe finance helpers: expense categories, cash register math, P&L aggregation.

export const EXPENSE_CATEGORIES = [
  { key: "rent", label: "Ijara" },
  { key: "utilities", label: "Kommunal" },
  { key: "salary", label: "Oylik" },
  { key: "purchase", label: "Xarid (ombor)" },
  { key: "marketing", label: "Marketing" },
  { key: "transport", label: "Transport" },
  { key: "other", label: "Boshqa" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"];

export const EXPENSE_CATEGORY_KEYS: string[] = EXPENSE_CATEGORIES.map((c) => c.key);

export const PAYMENT_METHODS = ["cash", "card", "transfer", "other"] as const;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Cash a register session should hold: opening float + cash in - cash out. */
export function expectedCash(opening: number, cashIncome: number, cashExpense: number): number {
  return round2(opening + cashIncome - cashExpense);
}

/** Positive = surplus, negative = shortage against the expected amount. */
export function cashDifference(expected: number, counted: number): number {
  return round2(counted - expected);
}

export function sumAmounts(rows: { amount: number | string | null }[]): number {
  return round2(rows.reduce((total, row) => total + Number(row.amount ?? 0), 0));
}

export function groupExpensesByCategory(rows: { category: string; amount: number | string | null }[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const row of rows) {
    grouped[row.category] = round2((grouped[row.category] ?? 0) + Number(row.amount ?? 0));
  }
  return grouped;
}

export function netProfit(income: number, totalExpenses: number): number {
  return round2(income - totalExpenses);
}
