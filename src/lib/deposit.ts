/**
 * Depozit — qabul tasdiqlanishi uchun oldindan olinadigan pul.
 *
 * Qoida xizmatda turadi (qat'iy summa yoki narx foizi), summa esa qabulga snapshot
 * bo'lib yoziladi: qoida keyin o'zgarsa ham mijozga aytilgan summa o'zgarmaydi.
 * Pulning o'zi To'lovlar daftariga (payments) yoziladi — shunda kassa va hisobotlar
 * to'liq qoladi, bu yerda faqat holat yuritiladi.
 */

export const DEPOSIT_TYPES = ["none", "fixed", "percent"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export const DEPOSIT_TYPE_LABELS: Record<DepositType, string> = {
  none: "Yo‘q",
  fixed: "Qat’iy summa",
  percent: "Narxdan %",
};

export const DEPOSIT_METHODS = ["cash", "payme", "click", "transfer", "card"] as const;
export type DepositMethod = (typeof DEPOSIT_METHODS)[number];

export const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  cash: "Naqd",
  payme: "Payme",
  click: "Click",
  transfer: "O‘tkazma",
  card: "Karta",
};

export const DEPOSIT_STATES = ["none", "pending", "paid", "refunded"] as const;
export type DepositState = (typeof DEPOSIT_STATES)[number];

export const DEPOSIT_STATE_LABELS: Record<DepositState, string> = {
  none: "Depozitsiz",
  pending: "Depozit kutilapti",
  paid: "Depozit qabul qilindi",
  refunded: "Depozit qaytarildi",
};

export type DepositRule = {
  deposit_type?: string | null;
  deposit_value?: unknown;
};

/**
 * Qabulga yoziladigan depozit summasi (so'm, butun son).
 * Hech qachon xizmat narxidan oshmaydi — 100% dan yuqori foiz yoki noto‘g‘ri
 * kiritilgan qat'iy summa mijozdan narxdan ko'p pul so'rashiga olib kelmasligi kerak.
 */
export function depositFor(rule: DepositRule | null | undefined, price: unknown): number {
  if (!rule || rule.deposit_type === "none") return 0;
  const value = Number(rule.deposit_value) || 0;
  if (value <= 0) return 0;
  const base = Math.round(Number(price) || 0);
  if (base <= 0) return rule.deposit_type === "percent" ? 0 : Math.round(value);
  if (rule.deposit_type === "percent") {
    // Naqd to'lov qulay bo'lishi uchun 100 so'mga yuqoriga yaxlitlanadi.
    return Math.min(Math.ceil((base * Math.min(value, 100)) / 100 / 100) * 100, base);
  }
  return Math.min(Math.round(value), base);
}

export type DepositLike = {
  deposit_amount?: unknown;
  deposit_paid_amount?: unknown;
  deposit_paid_at?: unknown;
  deposit_refunded_at?: unknown;
};

/** Depozit holati: bazadagi ustunlardan hisoblanadi, alohida saqlanmaydi. */
export function depositState(row: DepositLike | null | undefined): DepositState {
  const required = Number(row?.deposit_amount ?? 0) || 0;
  if (required <= 0) return "none";
  if (row?.deposit_refunded_at) return "refunded";
  return row?.deposit_paid_at ? "paid" : "pending";
}

/** Bir marta qabul qilingan depozitni faqat qaytarib, keyin qayta olish mumkin. */
export function canRecordDeposit(row: DepositLike | null | undefined): boolean {
  const state = depositState(row);
  return state === "pending" || state === "refunded";
}

export function canRefundDeposit(row: DepositLike | null | undefined): boolean {
  return depositState(row) === "paid";
}

/** Hali olinmagan depozit (filtr, belgi va jami uchun). */
export function depositOutstanding(row: DepositLike | null | undefined): number {
  return depositState(row) === "pending" ? Math.round(Number(row?.deposit_amount ?? 0) || 0) : 0;
}

/** Kutilayotgan depozitlar soni va jami. */
export function pendingDepositTotal(rows: DepositLike[]): { count: number; sum: number } {
  let count = 0;
  let sum = 0;
  for (const row of rows) {
    const outstanding = depositOutstanding(row);
    if (outstanding <= 0) continue;
    count += 1;
    sum += outstanding;
  }
  return { count, sum };
}
