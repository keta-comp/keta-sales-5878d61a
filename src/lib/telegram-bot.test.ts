// @ts-nocheck — repo testlari shu usulda: `bun:test` uchun tur ta'rifi yo'q.
import { describe, expect, test } from "bun:test";

import { parseWhen } from "./telegram-appointments.server";
import { isMainMenuText } from "./telegram-report.server";
import { cronAuthorized } from "./secure-compare.server";

const TZ = "Asia/Tashkent";

describe("bot main-menu text", () => {
  test("button captions and their slash commands are menu texts", () => {
    expect(isMainMenuText("📊 Bugungi hisobot")).toBe(true);
    expect(isMainMenuText("/today")).toBe(true);
    expect(isMainMenuText("🗓 Bugungi qabullar")).toBe(true);
    expect(isMainMenuText("➕ Yangi qabul")).toBe(true);
    expect(isMainMenuText("⚙️ Sozlamalar")).toBe(true);
    expect(isMainMenuText("/help")).toBe(true);
  });

  test("a bot mention suffix does not break matching", () => {
    expect(isMainMenuText("/today@ketaone_bot")).toBe(true);
  });

  test("form answers are not menu texts", () => {
    expect(isMainMenuText("Aziza Karimova")).toBe(false);
    expect(isMainMenuText("+998901234567")).toBe(false);
    expect(isMainMenuText("ertaga 11:30")).toBe(false);
    expect(isMainMenuText("parol123")).toBe(false);
  });
});

describe("quick booking time parsing", () => {
  test("explicit date and time become UTC in the business timezone", () => {
    expect(parseWhen("15.11 09:30", TZ)).toBe("2026-11-15T04:30:00.000Z");
    expect(parseWhen("15.11. 09:30", TZ)).toBe("2026-11-15T04:30:00.000Z");
  });

  test("a bare time is accepted and moved to a future day when already past", () => {
    const iso = parseWhen("23:50", TZ);
    expect(iso).not.toBeNull();
    expect(Date.parse(iso!)).toBeGreaterThan(Date.now());
  });

  test("ertaga means tomorrow in local time", () => {
    const iso = parseWhen("ertaga 10:00", TZ);
    expect(iso).not.toBeNull();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso!));
    const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    expect(read("hour")).toBe("10");
    expect(read("minute")).toBe("00");

    const localDay = Date.parse(`${read("year")}-${read("month")}-${read("day")}T00:00:00Z`);
    const tomorrowUtc = Date.now() + 5 * 3_600_000 + 86_400_000;
    const expectedDay = Math.floor(tomorrowUtc / 86_400_000) * 86_400_000;
    expect(localDay).toBe(expectedDay);
  });

  test("impossible times and dates are rejected", () => {
    expect(parseWhen("25:00", TZ)).toBeNull();
    expect(parseWhen("12:61", TZ)).toBeNull();
    expect(parseWhen("13.13 10:00", TZ)).toBeNull();
    expect(parseWhen("32.11 10:00", TZ)).toBeNull();
  });

  test("dates read as day.month", () => {
    expect(parseWhen("5.12 08:00", TZ)).toBe("2026-12-05T03:00:00.000Z");
  });

  test("text without a time asks the user to try again", () => {
    expect(parseWhen("Azizaga qabul", TZ)).toBeNull();
    expect(parseWhen("", TZ)).toBeNull();
  });
});

describe("cron request authorization", () => {
  const SECRET = "test-cron-secret";

  function request(method: string, headers: Record<string, string>) {
    return new Request("https://ketaone.uz/api/public/reminders", { method, headers });
  }

  test("accepts the secret in either header and on GET or POST", () => {
    process.env["LOVABLE_CRON_SECRET"] = SECRET;
    delete process.env["CRON_SECRET"];
    try {
      expect(cronAuthorized(request("POST", { "x-cron-secret": SECRET }))).toBe(true);
      expect(cronAuthorized(request("GET", { "x-cron-secret": SECRET }))).toBe(true);
      expect(cronAuthorized(request("GET", { authorization: `Bearer ${SECRET}` }))).toBe(true);
    } finally {
      delete process.env["LOVABLE_CRON_SECRET"];
    }
  });

  test("falls back to CRON_SECRET for Vercel-signed requests", () => {
    process.env["CRON_SECRET"] = SECRET;
    try {
      expect(cronAuthorized(request("GET", { authorization: `Bearer ${SECRET}` }))).toBe(true);
      expect(cronAuthorized(request("GET", { authorization: `Bearer wrong-secret` }))).toBe(false);
    } finally {
      delete process.env["CRON_SECRET"];
    }
  });

  test("fails closed: no secret configured, wrong secret, or unsupported method", () => {
    expect(cronAuthorized(request("GET", { authorization: `Bearer ${SECRET}` }))).toBe(false);

    process.env["LOVABLE_CRON_SECRET"] = SECRET;
    delete process.env["CRON_SECRET"];
    try {
      expect(cronAuthorized(request("GET", {}))).toBe(false);
      expect(cronAuthorized(request("GET", { "x-cron-secret": "" }))).toBe(false);
      expect(cronAuthorized(request("GET", { "x-cron-secret": "not-it" }))).toBe(false);
      expect(cronAuthorized(request("DELETE", { "x-cron-secret": SECRET }))).toBe(false);
    } finally {
      delete process.env["LOVABLE_CRON_SECRET"];
    }
  });
});
