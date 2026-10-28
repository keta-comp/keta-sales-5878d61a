export const APPOINTMENT_STATUSES = [
  "new",
  "confirmed",
  "arrived",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Statuses that still hold an employee's calendar slot. */
export const BOOKED_STATUSES: ReadonlySet<AppointmentStatus> = new Set(["new", "confirmed", "arrived"]);

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  new: "Yangi",
  confirmed: "Tasdiqlangan",
  arrived: "Keldi",
  completed: "Xizmat yakunlandi",
  cancelled: "Bekor qilindi",
  no_show: "Kelmadi",
};

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function appointmentEnd(startsAtIso: string, durationMinutes: number): string {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Davomiylik noto'g'ri.");
  }
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) throw new Error("Boshlanish vaqti noto'g'ri.");
  return addMinutes(startsAtIso, Math.round(durationMinutes));
}

/** Half-open interval overlap: touching edges (end === next start) do not conflict. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export type AppointmentLike = {
  id: string;
  employee_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

/** First scheduled appointment for the same employee overlapping the candidate window. */
export function findEmployeeConflict<T extends AppointmentLike>(
  candidate: { employee_id: string | null; starts_at: string; ends_at: string; id?: string },
  existing: T[],
): T | null {
  if (!candidate.employee_id) return null;
  for (const row of existing) {
    if (row.id === candidate.id) continue;
    if (!BOOKED_STATUSES.has(row.status as AppointmentStatus)) continue;
    if (row.employee_id !== candidate.employee_id) continue;
    if (overlaps(candidate.starts_at, candidate.ends_at, row.starts_at, row.ends_at)) return row;
  }
  return null;
}

/** Formats an ISO time as a datetime-local input value in the browser's timezone. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Converts a datetime-local input value (local time) to an ISO string. */
export function fromLocalInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Sana noto'g'ri kiritildi.");
  return date.toISOString();
}

export function dayBoundsIso(dateIso: string): { from: string; to: string } {
  const day = new Date(`${dateIso}T00:00:00`);
  const from = new Date(day);
  const to = new Date(day);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/* ------------------------- working-hours helpers ------------------------- */

export const DEFAULT_BUSINESS_TZ = "Asia/Tashkent";

export type WorkWindow = { start: number; end: number };

const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** ISO weekday (1=Mon..7=Sun) and wall-clock minutes of an instant in a timezone. */
export function zonedParts(iso: string, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAY_MAP[get("weekday")] ?? 1;
  const hour = Number(get("hour")) % 24;
  return { weekday, minutes: hour * 60 + Number(get("minute")) };
}

export function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) throw new Error("Vaqt formati noto'g'ri.");
  return Number(match[1]) * 60 + Number(match[2]);
}

/** One day's schedule rows expanded into working windows with the break removed. */
export function dayWindows(
  rows: Array<{ start_time: string; end_time: string; break_start: string | null; break_end: string | null }>,
): WorkWindow[] {
  const windows: WorkWindow[] = [];
  for (const row of rows) {
    const start = timeToMinutes(row.start_time);
    const end = timeToMinutes(row.end_time);
    if (row.break_start && row.break_end) {
      const bs = timeToMinutes(row.break_start);
      const be = timeToMinutes(row.break_end);
      if (bs > start) windows.push({ start, end: Math.min(bs, end) });
      if (be < end) windows.push({ start: Math.max(be, start), end });
    } else {
      windows.push({ start, end });
    }
  }
  return windows;
}

/** True when the whole duration fits inside one window on the same day. */
export function fitsInWindows(startMinutes: number, durationMinutes: number, windows: WorkWindow[]): boolean {
  const end = startMinutes + durationMinutes;
  if (end > 24 * 60) return false;
  return windows.some((w) => startMinutes >= w.start && end <= w.end);
}

export function isWithinTimeOff(
  startsAtIso: string,
  endsAtIso: string,
  timeOff: Array<{ starts_at: string; ends_at: string }>,
): boolean {
  return timeOff.some((off) => overlaps(startsAtIso, endsAtIso, off.starts_at, off.ends_at));
}
