// @ts-nocheck
import { describe, expect, test } from "bun:test";

import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_TAP_ORDER,
  shiftDayIso,
  summarize,
  todayIso,
} from "@/lib/attendance";

describe("attendance helpers", () => {
  test("every status is labelled and tappable", () => {
    expect([...ATTENDANCE_TAP_ORDER].sort()).toEqual([...ATTENDANCE_STATUSES].sort());
    for (const status of ATTENDANCE_STATUSES) expect(ATTENDANCE_STATUS_LABELS[status]).toBeTruthy();
  });

  test("summary counts only marked rows", () => {
    const rows = [
      { status: "present" },
      { status: "present" },
      { status: "late" },
      { status: "absent" },
      { status: "excused" },
      { status: null },
    ];
    expect(summarize(rows)).toEqual({
      total: 6,
      marked: 5,
      present: 2,
      late: 1,
      absent: 1,
      excused: 1,
    });
    expect(summarize([]).total).toBe(0);
    expect(summarize([{ status: null }]).marked).toBe(0);
  });

  test("day shifts cross month and year boundaries", () => {
    expect(shiftDayIso("2026-10-30", -1)).toBe("2026-10-29");
    expect(shiftDayIso("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDayIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDayIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDayIso("2026-10-30", 0)).toBe("2026-10-30");
    // Yetish kunlik oynatuvda eng chapdagi kun tanlangan kundan oldin bo'ladi.
    expect(shiftDayIso("2026-10-30", -6)).toBe("2026-10-24");
  });

  test("today is a plain ISO date", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
