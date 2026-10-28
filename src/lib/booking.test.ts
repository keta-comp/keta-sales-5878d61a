// @ts-nocheck
import { describe, expect, test } from "bun:test";

import {
  APPOINTMENT_STATUSES,
  BOOKED_STATUSES,
  addMinutes,
  appointmentEnd,
  dayBoundsIso,
  dayWindows,
  findEmployeeConflict,
  fitsInWindows,
  fromLocalInputValue,
  isWithinTimeOff,
  overlaps,
  timeToMinutes,
  toLocalInputValue,
  zonedParts,
} from "./booking";

describe("appointment time math", () => {
  test("appointmentEnd adds the service duration", () => {
    expect(appointmentEnd("2026-10-26T09:00:00.000Z", 45)).toBe("2026-10-26T09:45:00.000Z");
  });

  test("appointmentEnd rejects non-positive durations", () => {
    expect(() => appointmentEnd("2026-10-26T09:00:00.000Z", 0)).toThrow();
    expect(() => appointmentEnd("2026-10-26T09:00:00.000Z", -10)).toThrow();
  });

  test("addMinutes crosses day boundaries", () => {
    expect(addMinutes("2026-10-26T23:30:00.000Z", 60)).toBe("2026-10-27T00:30:00.000Z");
  });

  test("local input round-trips through ISO", () => {
    const iso = fromLocalInputValue("2026-10-26T14:30");
    expect(toLocalInputValue(iso)).toBe("2026-10-26T14:30");
  });

  test("dayBoundsIso covers exactly one local day", () => {
    const { from, to } = dayBoundsIso("2026-10-26");
    expect(new Date(from).getDate()).toBe(26);
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("double-booking detection", () => {
  const booked = (id: string, employee_id: string | null, starts_at: string, ends_at: string, status = "confirmed") => ({
    id,
    employee_id,
    starts_at,
    ends_at,
    status,
  });

  test("overlapping windows conflict", () => {
    expect(overlaps("2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z", "2026-10-26T09:30:00Z", "2026-10-26T10:30:00Z")).toBe(true);
  });

  test("back-to-back appointments do not conflict", () => {
    expect(overlaps("2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z", "2026-10-26T10:00:00Z", "2026-10-26T11:00:00Z")).toBe(false);
  });

  test("findEmployeeConflict only flags the same employee's booked rows", () => {
    const existing = [
      booked("a", "emp-1", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z"),
      booked("b", "emp-2", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z", "new"),
      booked("c", "emp-1", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z", "cancelled"),
    ];
    const candidate = {
      employee_id: "emp-1",
      starts_at: "2026-10-26T09:30:00Z",
      ends_at: "2026-10-26T10:30:00Z",
    };
    expect(findEmployeeConflict(candidate, existing)?.id).toBe("a");
  });

  test("arrived appointments still hold the slot", () => {
    const existing = [
      booked("a", "emp-1", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z", "arrived"),
    ];
    expect(
      findEmployeeConflict(
        { employee_id: "emp-1", starts_at: "2026-10-26T09:30:00Z", ends_at: "2026-10-26T10:30:00Z" },
        existing,
      )?.id,
    ).toBe("a");
  });

  test("completed appointments free the slot", () => {
    const existing = [
      booked("a", "emp-1", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z", "completed"),
    ];
    expect(
      findEmployeeConflict(
        { employee_id: "emp-1", starts_at: "2026-10-26T09:30:00Z", ends_at: "2026-10-26T10:30:00Z" },
        existing,
      ),
    ).toBeNull();
  });

  test("unassigned appointments never conflict", () => {
    expect(
      findEmployeeConflict(
        { employee_id: null, starts_at: "2026-10-26T09:00:00Z", ends_at: "2026-10-26T10:00:00Z" },
        [booked("a", "emp-1", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z")],
      ),
    ).toBeNull();
  });

  test("editing an appointment ignores its own row", () => {
    const existing = [booked("a", "emp-1", "2026-10-26T09:00:00Z", "2026-10-26T10:00:00Z")];
    expect(
      findEmployeeConflict(
        { id: "a", employee_id: "emp-1", starts_at: "2026-10-26T09:00:00Z", ends_at: "2026-10-26T10:00:00Z" },
        existing,
      ),
    ).toBeNull();
  });
});

describe("appointment statuses", () => {
  test("status list is stable and unique", () => {
    expect(APPOINTMENT_STATUSES).toEqual([
      "new",
      "confirmed",
      "arrived",
      "completed",
      "cancelled",
      "no_show",
    ]);
    expect(new Set(APPOINTMENT_STATUSES).size).toBe(APPOINTMENT_STATUSES.length);
  });

  test("booked statuses hold the slot", () => {
    expect([...BOOKED_STATUSES].sort()).toEqual(["arrived", "confirmed", "new"]);
    expect(BOOKED_STATUSES.has("completed")).toBe(false);
    expect(BOOKED_STATUSES.has("cancelled")).toBe(false);
    expect(BOOKED_STATUSES.has("no_show")).toBe(false);
  });
});

describe("working-hours helpers", () => {
  test("zonedParts returns ISO weekday and wall-clock minutes in the timezone", () => {
    // 2026-10-26 is a Monday; 04:00Z = 09:00 in Asia/Tashkent (UTC+5).
    expect(zonedParts("2026-10-26T04:00:00Z", "Asia/Tashkent")).toEqual({ weekday: 1, minutes: 9 * 60 });
    // 23:30 Monday UTC rolls to Tuesday 04:30 local.
    const late = zonedParts("2026-10-26T23:30:00Z", "Asia/Tashkent");
    expect(late).toEqual({ weekday: 2, minutes: 4 * 60 + 30 });
  });

  test("zonedParts maps Sunday to 7", () => {
    expect(zonedParts("2026-10-25T04:00:00Z", "Asia/Tashkent").weekday).toBe(7);
  });

  test("timeToMinutes parses HH:MM and HH:MM:SS", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("18:00:00")).toBe(1080);
    expect(() => timeToMinutes("bad")).toThrow();
  });

  test("dayWindows splits a shift around its break", () => {
    const windows = dayWindows([
      { start_time: "09:00", end_time: "18:00", break_start: "13:00", break_end: "14:00" },
    ]);
    expect(windows).toEqual([
      { start: 540, end: 780 },
      { start: 840, end: 1080 },
    ]);
  });

  test("dayWindows without a break is a single window", () => {
    expect(dayWindows([{ start_time: "10:00", end_time: "12:00", break_start: null, break_end: null }])).toEqual([
      { start: 600, end: 720 },
    ]);
  });

  test("dayWindows ignores a break outside the shift", () => {
    const windows = dayWindows([
      { start_time: "09:00", end_time: "12:00", break_start: "13:00", break_end: "14:00" },
    ]);
    expect(windows).toEqual([{ start: 540, end: 720 }]);
  });

  test("fitsInWindows requires the whole duration inside one window", () => {
    const windows = [
      { start: 540, end: 780 },
      { start: 840, end: 1080 },
    ];
    expect(fitsInWindows(540, 60, windows)).toBe(true);
    expect(fitsInWindows(750, 30, windows)).toBe(true); // ends exactly at the break
    expect(fitsInWindows(760, 30, windows)).toBe(false); // would cross into the break
    expect(fitsInWindows(780, 30, windows)).toBe(false); // starts during the break
    expect(fitsInWindows(500, 30, windows)).toBe(false); // before opening
    expect(fitsInWindows(1070, 20, windows)).toBe(false); // past midnight guard
  });

  test("isWithinTimeOff flags overlapping absences", () => {
    const timeOff = [{ starts_at: "2026-11-02T00:00:00Z", ends_at: "2026-11-05T00:00:00Z" }];
    expect(isWithinTimeOff("2026-11-03T09:00:00Z", "2026-11-03T10:00:00Z", timeOff)).toBe(true);
    expect(isWithinTimeOff("2026-11-04T22:00:00Z", "2026-11-05T01:00:00Z", timeOff)).toBe(true);
    expect(isWithinTimeOff("2026-11-05T00:00:00Z", "2026-11-05T01:00:00Z", timeOff)).toBe(false);
    expect(isWithinTimeOff("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z", timeOff)).toBe(false);
  });
});
