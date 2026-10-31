// @ts-nocheck
import { describe, expect, test } from "bun:test";

import {
  DEPOSIT_METHODS,
  DEPOSIT_METHOD_LABELS,
  DEPOSIT_STATE_LABELS,
  DEPOSIT_STATES,
  DEPOSIT_TYPE_LABELS,
  DEPOSIT_TYPES,
  canRecordDeposit,
  canRefundDeposit,
  depositFor,
  depositOutstanding,
  depositState,
  pendingDepositTotal,
} from "./deposit";

describe("depositFor", () => {
  test("qoida yo‘q yoki qiymat nol — depozit olinmaydi", () => {
    expect(depositFor({ deposit_type: "none", deposit_value: 50 }, 100_000)).toBe(0);
    expect(depositFor({ deposit_type: "percent", deposit_value: 0 }, 100_000)).toBe(0);
    expect(depositFor(null, 100_000)).toBe(0);
  });

  test("foiz narxdan hisoblanadi va 100 so‘mga yuqoriga yaxlitlanadi", () => {
    expect(depositFor({ deposit_type: "percent", deposit_value: 30 }, 100_000)).toBe(30_000);
    expect(depositFor({ deposit_type: "percent", deposit_value: 15 }, 33_450)).toBe(5_100);
  });

  test("100% dan yuqori foiz talab qilingan summa narxdan oshmaydi", () => {
    expect(depositFor({ deposit_type: "percent", deposit_value: 150 }, 20_000)).toBe(20_000);
  });

  test("qat’iy summa narxdan oshmaydi, narx bo‘lmaganda o‘zi qoladi", () => {
    expect(depositFor({ deposit_type: "fixed", deposit_value: 20_000 }, 50_000)).toBe(20_000);
    expect(depositFor({ deposit_type: "fixed", deposit_value: 70_000 }, 50_000)).toBe(50_000);
    expect(depositFor({ deposit_type: "fixed", deposit_value: 10_000 }, 0)).toBe(10_000);
    expect(depositFor({ deposit_type: "percent", deposit_value: 20 }, 0)).toBe(0);
  });

  test("NUMERIC ustunlar matn bo‘lib qaytsa ham ishlaydi", () => {
    expect(depositFor({ deposit_type: "percent", deposit_value: "20" }, "50000")).toBe(10_000);
    expect(depositFor({ deposit_type: "fixed", deposit_value: "15000.00" }, "50000")).toBe(15_000);
  });
});

describe("depositState", () => {
  test("depozit belgilanmagan qabul", () => {
    expect(depositState({ deposit_amount: null })).toBe("none");
    expect(depositState({ deposit_amount: 0, deposit_paid_at: "2026-10-31T10:00:00Z" })).toBe("none");
  });

  test("kutilapti → qabul qilindi → qaytarildi", () => {
    const pending = { deposit_amount: 50_000 };
    expect(depositState(pending)).toBe("pending");
    expect(canRecordDeposit(pending)).toBe(true);
    expect(canRefundDeposit(pending)).toBe(false);

    const paid = { ...pending, deposit_paid_at: "2026-10-31T10:00:00Z", deposit_paid_amount: 50_000 };
    expect(depositState(paid)).toBe("paid");
    expect(canRecordDeposit(paid)).toBe(false);
    expect(canRefundDeposit(paid)).toBe(true);

    const refunded = { ...paid, deposit_refunded_at: "2026-10-31T12:00:00Z" };
    expect(depositState(refunded)).toBe("refunded");
    expect(canRecordDeposit(refunded)).toBe(true);
    expect(canRefundDeposit(refunded)).toBe(false);
  });

  test("qaytarilgan depozit qabul qilingan deb hisoblanmaydi", () => {
    const refunded = { deposit_amount: 30_000, deposit_refunded_at: "2026-10-31T12:00:00Z" };
    expect(depositOutstanding(refunded)).toBe(0);
  });
});

describe("depozit jami", () => {
  test("faqat kutilayotganlar sonaladi va yig'iladi", () => {
    const rows = [
      { deposit_amount: 50_000 },
      { deposit_amount: 30_000, deposit_paid_at: "2026-10-31T09:00:00Z", deposit_paid_amount: 30_000 },
      { deposit_amount: null },
      { deposit_amount: 20_000 },
    ];
    expect(pendingDepositTotal(rows)).toEqual({ count: 2, sum: 70_000 });
    expect(depositOutstanding(rows[0])).toBe(50_000);
  });
});

describe("belgilar", () => {
  test("har bir tur, usul va holatning o‘zbekcha nomi bor", () => {
    expect(DEPOSIT_STATES).toHaveLength(4);
    for (const state of DEPOSIT_STATES) expect(DEPOSIT_STATE_LABELS[state]).toBeTruthy();
    for (const type of DEPOSIT_TYPES) expect(DEPOSIT_TYPE_LABELS[type]).toBeTruthy();
    for (const method of DEPOSIT_METHODS) expect(DEPOSIT_METHOD_LABELS[method]).toBeTruthy();
  });
});
