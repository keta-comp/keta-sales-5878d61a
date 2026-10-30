/**
 * Eslatma (reminder) qoidalari — faqat sof hisob: bazaga tegilmaydi, shuning uchun
 * testlarda to'liq qoplanadi. Yuborish tarafi `reminders.server.ts`'da.
 */
import { DEFAULT_BUSINESS_TZ } from "./booking";

/** Qabul boshlanishiga shuncha daqiqa qolganda eslatma tayyor bo'ladi. */
export const APPOINTMENT_LEAD_MINUTES = 90;
/** Boshlanib ketgan qabulga shuncha daqiqadan keyin eslatmaymiz. */
export const APPOINTMENT_LATE_GRACE_MINUTES = 30;

/** Bir yozuv uchun eslatma yuborilgan vaqt/identifikator (jadvalning `data` jsonb ustunida). */
export type ReminderMark = { reminder_sent_at?: string | null; reminder_sent_for?: string | null };

type RowLike = { data?: (ReminderMark & Record<string, unknown>) | null };

type DataObject = Record<string, unknown>;

/**
 * `data` ustunini obyektda ushlab qoladi. PostgREST-shim ba'zida jsonb'ni satr
 * qaytarsa yoki eski yozuvda jsonb string scalar saqlansa, `{ ...satr }` har bir
 * belgini alohida kalitga aylantirib mitti maydonlarni yo'q qiladi.
 */
export function asData(value: unknown): DataObject {
  if (value && typeof value === "object") return value as DataObject;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed) as DataObject;
      } catch {
        return {};
      }
    }
  }
  return {};
}

export function alreadyMarked(row: RowLike): boolean {
  return typeof markOf(row).reminder_sent_at === "string" && markOf(row).reminder_sent_at !== "";
}

function markOf(row: RowLike): ReminderMark {
  return asData(row.data) as ReminderMark;
}

/** Qabul eslatmasi yuborilishi kerakmi: deraja ichida, oldin yuborilmagan bo'lsa. */
export function appointmentReminderDue(
  row: RowLike & { starts_at: string },
  now: Date = new Date(),
): boolean {
  if (alreadyMarked(row)) return false;
  const startsAt = new Date(row.starts_at).getTime();
  if (!Number.isFinite(startsAt)) return false;
  const minutes = (startsAt - now.getTime()) / 60_000;
  return minutes <= APPOINTMENT_LEAD_MINUTES && minutes >= -APPOINTMENT_LATE_GRACE_MINUTES;
}

/** `data` ustuniga eslatma belgisini qo'shadi (qolgan mitti maydonlar saqlanadi). */
export function withReminderMark(
  data: (ReminderMark & Record<string, unknown>) | null | undefined,
  sentAt: string,
): Record<string, unknown> {
  return { ...asData(data), reminder_sent_at: sentAt };
}

/* ------------------------------- to'lovlar -------------------------------- */

/**
 * Muddati o'tgan to'lov eslatmasi: `due_date` bugundan kechikgan va shu muddat uchun
 * hali yuborilmagan. `reminder_sent_for` muddat yangilansa eslatmani qayta faollashtiradi.
 */
export function paymentReminderDue(
  row: RowLike & { due_date?: string | null },
  todayKey: string,
): boolean {
  if (!row.due_date) return false;
  if (markOf(row).reminder_sent_for === row.due_date) return false;
  return row.due_date <= todayKey;
}

export function withPaymentMark(
  data: (ReminderMark & Record<string, unknown>) | null | undefined,
  dueDate: string,
  sentAt: string,
): Record<string, unknown> {
  return { ...asData(data), reminder_sent_for: dueDate, reminder_sent_at: sentAt };
}

/* -------------------------------- vaqtlar -------------------------------- */

/** ISO lahzani biznes soat mintaqasidagi "09:00" ko'rinishida qaytaradi. */
export function localTime(iso: string, timeZone: string = DEFAULT_BUSINESS_TZ): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Biznes soat mintaqasidagi "YYYY-MM-DD" kaliti (sanalar UTC yarim tuniga bo'lmaydi). */
export function localDateKey(date: Date, timeZone: string = DEFAULT_BUSINESS_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
