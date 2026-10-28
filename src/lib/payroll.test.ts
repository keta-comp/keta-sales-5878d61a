// @ts-nocheck
import { describe, expect, test } from "bun:test";

import { PAYROLL_STATUSES, buildPayrollExpense, computeStatement, dateBoundsIso, monthPeriod, roundMoney } from "./payroll";

describe("roundMoney", () => {
  test("rounds to two decimals", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1234.565)).toBe(1234.57);
    expect(roundMoney(99.994)).toBe(99.99);
  });
});

describe("computeStatement", () => {
  test("splits revenue, per-service override beats rule percent", () => {
    const totals = computeStatement({
      baseSalary: 1_000_000,
      ruleCommissionPercent: 5,
      rows: [
        { service_id: "s1", price: 100_000 },
        { service_id: "s2", price: 200_000 },
      ],
      overrides: [{ service_id: "s2", commission_percent: 10 }],
    });
    expect(totals.serviceRevenue).toBe(300_000);
    // s1: 5% of 100k = 5000, s2: 10% of 200k = 20000
    expect(totals.commissionAmount).toBe(25_000);
    expect(totals.totalComputed).toBe(1_025_000);
  });

  test("rule percent applies when no override exists", () => {
    const totals = computeStatement({
      baseSalary: 0,
      ruleCommissionPercent: 15,
      rows: [{ service_id: "s1", price: 90_000 }],
      overrides: [],
    });
    expect(totals.commissionAmount).toBe(13_500);
    expect(totals.totalComputed).toBe(13_500);
  });

  test("rows without a service still count revenue but earn rule commission", () => {
    const totals = computeStatement({
      baseSalary: 500_000,
      ruleCommissionPercent: 10,
      rows: [{ service_id: null, price: 60_000 }],
      overrides: [{ service_id: "s1", commission_percent: 20 }],
    });
    expect(totals.serviceRevenue).toBe(60_000);
    expect(totals.commissionAmount).toBe(6_000);
  });

  test("zero and negative prices are ignored", () => {
    const totals = computeStatement({
      baseSalary: 0,
      ruleCommissionPercent: 10,
      rows: [
        { service_id: "s1", price: 0 },
        { service_id: "s1", price: -5_000 },
        { service_id: "s1", price: null },
      ],
      overrides: [],
    });
    expect(totals.serviceRevenue).toBe(0);
    expect(totals.commissionAmount).toBe(0);
  });

  test("bonus, advance and deduction adjust the total", () => {
    const totals = computeStatement({
      baseSalary: 800_000,
      ruleCommissionPercent: 0,
      rows: [{ service_id: "s1", price: 100_000 }],
      overrides: [],
      bonusAmount: 100_000,
      advanceAmount: 200_000,
      deductionAmount: 50_000,
    });
    expect(totals.totalComputed).toBe(650_000);
  });

  test("total may go negative when advances exceed earnings", () => {
    const totals = computeStatement({
      baseSalary: 100_000,
      ruleCommissionPercent: 5,
      rows: [],
      overrides: [],
      advanceAmount: 150_000,
    });
    expect(totals.totalComputed).toBe(-50_000);
  });
});

describe("monthPeriod", () => {
  test("february leap year bounds", () => {
    expect(monthPeriod(2028, 2)).toEqual({ period_start: "2028-02-01", period_end: "2028-02-29" });
  });
  test("december bounds", () => {
    expect(monthPeriod(2026, 12)).toEqual({ period_start: "2026-12-01", period_end: "2026-12-31" });
  });
});

describe("dateBoundsIso", () => {
  test("produces Tashkent-day [from, next-day-start) window", () => {
    const bounds = dateBoundsIso("2026-10-01", "2026-10-31");
    expect(bounds.from).toBe("2026-10-01T00:00:00+05:00");
    expect(bounds.to).toBe("2026-11-01T00:00:00+05:00");
  });
  test("single day is exclusive at the end", () => {
    const bounds = dateBoundsIso("2026-10-27", "2026-10-27");
    expect(bounds.to).toBe("2026-10-28T00:00:00+05:00");
  });
});

describe("PAYROLL_STATUSES", () => {
  test("only draft/approved/paid exist", () => {
    expect(PAYROLL_STATUSES).toEqual(["draft", "approved", "paid"]);
  });
});

describe("buildPayrollExpense", () => {
  const base = {
    employeeName: "Malika",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    paymentMethod: "cash",
    paidAt: new Date("2026-10-27T21:00:00Z"),
  };

  test("a positive payout becomes a salary expense dated in Tashkent", () => {
    const expense = buildPayrollExpense({ ...base, amount: 1234567.891 });
    expect(expense).not.toBeNull();
    expect(expense?.category).toBe("salary");
    expect(expense?.amount).toBe(1234567.89);
    expect(expense?.expense_date).toBe("2026-10-28");
    expect(expense?.note).toContain("Malika");
    expect(expense?.note).toContain("2026-10-01");
  });

  test("nothing is booked when the statement pays out zero or less", () => {
    expect(buildPayrollExpense({ ...base, amount: 0 })).toBeNull();
    expect(buildPayrollExpense({ ...base, amount: -5000 })).toBeNull();
  });
});
