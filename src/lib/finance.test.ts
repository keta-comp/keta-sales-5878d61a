// @ts-nocheck
import { describe, expect, test } from "bun:test";

import {
  EXPENSE_CATEGORIES,
  cashDifference,
  expectedCash,
  groupExpensesByCategory,
  netProfit,
  round2,
  sumAmounts,
} from "./finance";

describe("cash register math", () => {
  test("expected cash = opening + income - expense", () => {
    expect(expectedCash(500_000, 1_200_000, 300_000)).toBe(1_400_000);
    expect(expectedCash(0, 0, 0)).toBe(0);
    expect(expectedCash(100.005, 0.005, 0.01)).toBe(100);
  });

  test("difference is counted minus expected", () => {
    expect(cashDifference(1_400_000, 1_400_000)).toBe(0);
    expect(cashDifference(1_400_000, 1_390_000)).toBe(-10_000);
    expect(cashDifference(1_400_000, 1_410_000)).toBe(10_000);
  });

  test("money never drifts past two decimals", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1234.5678)).toBe(1234.57);
  });
});

describe("aggregations", () => {
  test("sums numeric strings from Postgres NUMERIC columns", () => {
    expect(sumAmounts([{ amount: "100.50" }, { amount: 200 }, { amount: null }])).toBe(300.5);
  });

  test("groups expenses by category", () => {
    const grouped = groupExpensesByCategory([
      { category: "rent", amount: "1000" },
      { category: "rent", amount: 500 },
      { category: "salary", amount: "2000" },
    ]);
    expect(grouped).toEqual({ rent: 1500, salary: 2000 });
  });

  test("net profit subtracts total expenses from income", () => {
    expect(netProfit(5_000_000, 2_000_000)).toBe(3_000_000);
    expect(netProfit(1_000_000, 1_500_000)).toBe(-500_000);
  });

  test("category keys are unique and all have Uzbek labels", () => {
    const keys = EXPENSE_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of EXPENSE_CATEGORIES) expect(c.label.length).toBeGreaterThan(0);
  });
});
