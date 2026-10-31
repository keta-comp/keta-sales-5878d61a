// @ts-nocheck
import { describe, expect, test } from "bun:test";

import {
  GROUP_STATUS_LABELS,
  isFull,
  lastDayOfMonth,
  lessonDaysLabel,
  monthKey,
  parseLessonDays,
  seatsLeft,
  tuitionPrice,
} from "./groups";

describe("oylik narx ustuvorligi", () => {
  test("a‘zo narxi guruh va kurs narxidan ustun", () => {
    expect(tuitionPrice({ memberPrice: 60_000, groupPrice: 80_000, coursePrice: 100_000 })).toBe(
      60_000,
    );
    expect(tuitionPrice({ groupPrice: 80_000, coursePrice: 100_000 })).toBe(80_000);
    expect(tuitionPrice({ coursePrice: 100_000 })).toBe(100_000);
  });

  test("0 va null belgilanmagan — pastdagi narxga qaytamiz", () => {
    expect(tuitionPrice({ memberPrice: 0, groupPrice: "80000", coursePrice: 100_000 })).toBe(
      80_000,
    );
    expect(
      tuitionPrice({ memberPrice: null, groupPrice: undefined, coursePrice: "120000.5" }),
    ).toBe(120_001);
    expect(tuitionPrice({})).toBe(0);
  });

  test("matndagi narx ham hisobgaolinadi", () => {
    expect(tuitionPrice({ coursePrice: "95000" })).toBe(95_000);
    expect(tuitionPrice({ coursePrice: "arp" })).toBe(0);
  });
});

describe("dars kunlari", () => {
  test("tartib va takrorlar tozalanadi", () => {
    expect(parseLessonDays("5,1,3,1")).toEqual([1, 3, 5]);
    expect(parseLessonDays("")).toEqual([]);
    expect(parseLessonDays(null)).toEqual([]);
    expect(parseLessonDays("0,8,abc,4")).toEqual([4]);
  });

  test("belgilar o‘qiladigan matnga aylanadi", () => {
    expect(lessonDaysLabel("1,3,5")).toBe("Du, Ch, Ju");
    expect(lessonDaysLabel("2")).toBe("Se");
    expect(lessonDaysLabel("")).toBe("");
  });

  test("statuslar to‘liq nomlangan", () => {
    expect(Object.keys(GROUP_STATUS_LABELS)).toEqual([
      "collecting",
      "active",
      "finished",
      "archived",
    ]);
  });
});

describe("sig‘im", () => {
  test("0 sig‘im cheksiz degani", () => {
    expect(seatsLeft(0, 40)).toBe(null);
    expect(isFull(0, 40)).toBe(false);
  });

  test("joy sanaladi va to‘lgan belgilanadi", () => {
    expect(seatsLeft(12, 5)).toBe(7);
    expect(seatsLeft(12, 12)).toBe(0);
    expect(isFull(12, 12)).toBe(true);
    expect(isFull("6", 5)).toBe(false);
  });
});

describe("oy davri", () => {
  test("monthKey YYYY-MM qaytaradi", () => {
    expect(monthKey(new Date(2026, 9, 31))).toBe("2026-10");
    expect(monthKey(new Date(2026, 0, 5))).toBe("2026-01");
  });

  test("oxirgi kun — kabiys kunlari ham", () => {
    expect(lastDayOfMonth("2026-10")).toBe("2026-10-31");
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
    expect(lastDayOfMonth("2024-02")).toBe("2024-02-29");
    expect(lastDayOfMonth("2026-11")).toBe("2026-11-30");
  });
});
