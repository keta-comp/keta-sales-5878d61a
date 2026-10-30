/** Client-safe davomat konstantalari (o‘quv markazlari, sinflar, guruhlar). */

export const ATTENDANCE_STATUSES = ["present", "absent", "excused", "late"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Keldi",
  absent: "Kelmadi",
  excused: "Sababli",
  late: "Kechikdi",
};

/** Bir bosishda tanlanadigan holatlar tartibi: eng ko‘p ishlatilgani birinchi. */
export const ATTENDANCE_TAP_ORDER: AttendanceStatus[] = ["present", "late", "excused", "absent"];

export type AttendanceSummary = {
  total: number;
  marked: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
};

export function summarize(rows: { status: AttendanceStatus | null }[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    total: rows.length,
    marked: 0,
    present: 0,
    absent: 0,
    excused: 0,
    late: 0,
  };
  for (const row of rows) {
    if (!row.status) continue;
    summary.marked += 1;
    summary[row.status] += 1;
  }
  return summary;
}

export function shiftDayIso(dayIso: string, delta: number): string {
  const date = new Date(`${dayIso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return toIsoDay(date);
}

function toIsoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): string {
  return toIsoDay(new Date());
}
