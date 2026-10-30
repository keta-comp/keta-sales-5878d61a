// @ts-nocheck
import { describe, expect, test } from "bun:test";

import {
  APPOINTMENT_LEAD_MINUTES,
  alreadyMarked,
  appointmentReminderDue,
  asData,
  localDateKey,
  localTime,
  paymentReminderDue,
  withPaymentMark,
  withReminderMark,
} from "./reminders";

const NOW = new Date("2026-10-29T04:00:00.000Z");
const inMinutes = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();

describe("qabul eslatmasi", () => {
  test("deraja ichidagi qabul eslatiladi", () => {
    expect(appointmentReminderDue({ starts_at: inMinutes(60) }, NOW)).toBe(true);
    expect(appointmentReminderDue({ starts_at: inMinutes(APPOINTMENT_LEAD_MINUTES) }, NOW)).toBe(true);
  });

  test("juda uzoq va juda kechikkan qabul eslatilmaydi", () => {
    expect(appointmentReminderDue({ starts_at: inMinutes(120) }, NOW)).toBe(false);
    expect(appointmentReminderDue({ starts_at: inMinutes(-45) }, NOW)).toBe(false);
  });

  test("yuborilgan belgi takrorlanishni to'xtatadi", () => {
    const row = { starts_at: inMinutes(30), data: { reminder_sent_at: NOW.toISOString() } };
    expect(alreadyMarked(row)).toBe(true);
    expect(appointmentReminderDue(row, NOW)).toBe(false);
  });

  test("buzilgan sana eslatmaydi, xato bermaydi", () => {
    expect(appointmentReminderDue({ starts_at: "" }, NOW)).toBe(false);
  });

  test("belgi qo'yilganda mitti maydonlar saqlanadi", () => {
    expect(withReminderMark({ bolim: "Kardiologiya", holat: "Navbatda" }, NOW.toISOString())).toEqual({
      bolim: "Kardiologiya",
      holat: "Navbatda",
      reminder_sent_at: NOW.toISOString(),
    });
    expect(withReminderMark(null, NOW.toISOString())).toEqual({ reminder_sent_at: NOW.toISOString() });
  });

  test("jsonb satr bo'lib qolsa ham belgi mitti maydonni saqlaydi", () => {
    const asString = JSON.stringify({ bolim: "Kardiologiya" });
    expect(asData(asString)).toEqual({ bolim: "Kardiologiya" });
    expect(withReminderMark(asString as never, NOW.toISOString())).toEqual({
      bolim: "Kardiologiya",
      reminder_sent_at: NOW.toISOString(),
    });
    expect(asData('{"reminder_sent_at":"2026-10-29T04:00:00.000Z"}')).toEqual({
      reminder_sent_at: "2026-10-29T04:00:00.000Z",
    });
    expect(alreadyMarked({ data: asString })).toBe(false);
  });

  test("asData yaroqsiz qiymatni bo'sh obyektga qaytaradi", () => {
    expect(asData(null)).toEqual({});
    expect(asData("shunchaki matn")).toEqual({});
    expect(asData(42)).toEqual({});
  });
});

describe("to'lov eslatmasi", () => {
  test("muddati o'tgan to'lov eslatiladi", () => {
    expect(paymentReminderDue({ due_date: "2026-10-28" }, "2026-10-29")).toBe(true);
    expect(paymentReminderDue({ due_date: "2026-10-29" }, "2026-10-29")).toBe(true);
  });

  test("kelasi kunga qoldirilgan va sanasiz to'lov eslatilmaydi", () => {
    expect(paymentReminderDue({ due_date: "2026-11-05" }, "2026-10-29")).toBe(false);
    expect(paymentReminderDue({ due_date: null }, "2026-10-29")).toBe(false);
  });

  test("shu muddat uchun bir marta yuboriladi, muddat o'zgarsa qaytadi", () => {
    const row = { due_date: "2026-10-28", data: { reminder_sent_for: "2026-10-28" } };
    expect(paymentReminderDue(row, "2026-10-29")).toBe(false);
    expect(paymentReminderDue({ ...row, due_date: "2026-10-30" }, "2026-11-01")).toBe(true);
  });

  test("to'lov belgisi muddatni ham, vaqtni ham yozib qo'yadi", () => {
    expect(withPaymentMark({ tur: "qarz" }, "2026-10-28", NOW.toISOString())).toEqual({
      tur: "qarz",
      reminder_sent_for: "2026-10-28",
      reminder_sent_at: NOW.toISOString(),
    });
  });
});

describe("biznes zonasi", () => {
  test("soat va sana Toshkent bo'yicha o'qiladi", () => {
    expect(localTime("2026-10-29T04:00:00.000Z")).toBe("09:00");
    expect(localDateKey(new Date("2026-10-28T19:30:00.000Z"))).toBe("2026-10-29");
    expect(localTime("buzilgan")).toBe("");
  });
});
