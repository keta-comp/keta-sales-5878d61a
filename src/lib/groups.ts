/**
 * O‘quv markazi obyektlari: guruh holatlari, oylik narx ustuvorligi va dars kunlari.
 * Sof funksiyalar — server chaqiruvisiz testlanadi.
 */

export const GROUP_STATUSES = ["collecting", "active", "finished", "archived"] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  collecting: "To‘planyapti",
  active: "Faol",
  finished: "Tugagan",
  archived: "Arxivlangan",
};

export const MEMBER_STATUSES = ["active", "archived"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** 1=Dushanba ... 7=Yakshanba — `work_schedules.weekday` bilan bir xil tartib. */
export const WEEKDAY_LABELS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export type PriceSource = {
  /** group_members.monthly_price — shaxsiy chegirma. */
  memberPrice?: string | number | null | undefined;
  /** study_groups.monthly_price — 0 bo‘lsa kurs narxiga qaytadi. */
  groupPrice?: string | number | null | undefined;
  /** services.price — kurs narxi (o‘quv markazida bu oylik to‘lov). */
  coursePrice?: string | number | null | undefined;
};

/**
 * Oylik narx: a'zo narxi > guruh narxi > kurs narxi.
 * Har bir bosqichda 0 va null "belgilanmagan" hisoblanadi, chunki UI maydonni
 * bo‘sh qoldirganda 0 yuboradi va bu kurs narxini o‘chirib qo‘ymasligi kerak.
 */
export function tuitionPrice(source: PriceSource): number {
  for (const value of [source.memberPrice, source.groupPrice, source.coursePrice]) {
    const amount = Math.round(Number(value) || 0);
    if (amount > 0) return amount;
  }
  return 0;
}

/** "1,3,5" → "Du,Se,Ch". Noto‘g‘ri belgilar e'tiborga olinmaydi. */
export function lessonDaysLabel(days: string | null | undefined): string {
  return parseLessonDays(days)
    .map((day) => WEEKDAY_LABELS[day - 1] ?? "")
    .filter(Boolean)
    .join(", ");
}

export function parseLessonDays(days: string | null | undefined): number[] {
  const parsed = (days ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  return [...new Set(parsed)].sort((a, b) => a - b);
}

/** Sig'im 0 bo‘lsa cheksiz; aks holda joy qolganini aynan shu yerdan bilamiz. */
export function seatsLeft(
  capacity: string | number | null | undefined,
  members: number,
): number | null {
  const limit = Number(capacity) || 0;
  if (limit <= 0) return null;
  return limit - members;
}

export function isFull(capacity: string | number | null | undefined, members: number): boolean {
  const left = seatsLeft(capacity, members);
  return left !== null && left <= 0;
}

/** "2026-10" + 0 → "2026-10"; oxirgi kun oylik muddati uchun (29-fevralga ham yaroqli). */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

export function lastDayOfMonth(period: string): string {
  const parts = period.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(day).padStart(2, "0")}`;
}
