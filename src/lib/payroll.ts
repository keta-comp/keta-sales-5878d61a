// Browser-safe payroll math (brief 5.7). Kept pure so it is unit-testable and
// shared between the generation server function and the UI previews.

export const PAYROLL_STATUSES = ["draft", "approved", "paid"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Qoralama",
  approved: "Tasdiqlangan",
  paid: "To'langan",
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type CommissionOverride = { service_id: string; commission_percent: number };

export type RevenueRow = { service_id: string | null; price: number | null };

export type StatementInput = {
  baseSalary: number;
  ruleCommissionPercent: number;
  rows: RevenueRow[];
  overrides: CommissionOverride[];
  bonusAmount?: number;
  advanceAmount?: number;
  deductionAmount?: number;
};

export type StatementTotals = {
  serviceRevenue: number;
  commissionAmount: number;
  totalComputed: number;
};

/**
 * Commission is computed per completed appointment: the per-service override on
 * employee_services wins over the payroll_rules percent. Prices are the booking
 * snapshots, so later price changes never rewrite history.
 */
export function computeStatement(input: StatementInput): StatementTotals {
  const overrideByService = new Map(input.overrides.map((o) => [o.service_id, o.commission_percent]));
  let serviceRevenue = 0;
  let commissionAmount = 0;
  for (const row of input.rows) {
    const price = Number(row.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) continue;
    serviceRevenue += price;
    const percent = row.service_id != null ? overrideByService.get(row.service_id) : undefined;
    const applied = percent ?? input.ruleCommissionPercent;
    if (applied > 0) commissionAmount += (price * applied) / 100;
  }
  const bonus = input.bonusAmount ?? 0;
  const advance = input.advanceAmount ?? 0;
  const deduction = input.deductionAmount ?? 0;
  const totalComputed = roundMoney(
    (input.baseSalary ?? 0) + roundMoney(commissionAmount) + bonus - advance - deduction,
  );
  return { serviceRevenue: roundMoney(serviceRevenue), commissionAmount: roundMoney(commissionAmount), totalComputed };
}

/* --------------------------- teacher tuition base --------------------------- */

export type TaughtGroup = { id: string; name: string; course_id: string | null };

export type TuitionPayment = {
  group_id: string | null;
  amount: number | string | null;
  status: string;
  paid_at: string | null;
  created_at: string | null;
  period_month: string | null;
};

export type TuitionWindow = { from: string; to: string; firstMonth: string; lastMonth: string };

export type GroupTuition = { id: string; name: string; collected: number; planned: number };

export type TuitionSummary = {
  /** One commission row per collected payment, keyed to the group's course. */
  rows: RevenueRow[];
  groups: GroupTuition[];
  collected: number;
  planned: number;
};

export function tuitionWindow(periodStart: string, periodEnd: string): TuitionWindow {
  const bounds = dateBoundsIso(periodStart, periodEnd);
  return {
    from: bounds.from,
    to: bounds.to,
    firstMonth: periodStart.slice(0, 7),
    lastMonth: periodEnd.slice(0, 7),
  };
}

/**
 * O'qituvchi haqi u o'qitayotgan guruhning TO'LANGAN oylikidan hisoblanadi.
 * Kutilgan (pending) oylik komissiya bazasiga kirmaydi — pul tushmagunicha
 * haq to'lanmaydi, aks holda qarzdor o'quvchi uchun xodimga pul chiqadi.
 * To'langan oylik kurs (services) id'si bilan qator bo'ladi, shuning uchun
 * xizmat bo'yicha komissiya ustunligi guruhga ham ishlaydi.
 */
export function summariseTuition(
  groups: TaughtGroup[],
  payments: TuitionPayment[],
  window: TuitionWindow,
): TuitionSummary {
  const courseByGroup = new Map(groups.map((group) => [group.id, group.course_id]));
  const totals = new Map(groups.map((group) => [group.id, { collected: 0, planned: 0 }]));
  const rows: RevenueRow[] = [];
  const fromMs = Date.parse(window.from);
  const toMs = Date.parse(window.to);

  for (const payment of payments) {
    const entry = payment.group_id ? totals.get(payment.group_id) : undefined;
    if (!entry) continue;
    const amount = Math.round(Number(payment.amount) || 0);
    if (amount <= 0) continue;
    if (payment.status === "paid" || payment.status === "partial") {
      const paidMs = Date.parse(payment.paid_at ?? payment.created_at ?? "");
      if (!Number.isFinite(paidMs) || paidMs < fromMs || paidMs >= toMs) continue;
      entry.collected += amount;
      rows.push({
        service_id: payment.group_id ? (courseByGroup.get(payment.group_id) ?? null) : null,
        price: amount,
      });
      continue;
    }
    if (payment.status !== "pending") continue;
    const month = payment.period_month ?? "";
    if (month >= window.firstMonth && month <= window.lastMonth) entry.planned += amount;
  }

  const summary: GroupTuition[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    collected: totals.get(group.id)?.collected ?? 0,
    planned: totals.get(group.id)?.planned ?? 0,
  }));
  return {
    rows,
    groups: summary,
    collected: summary.reduce((sum, group) => sum + group.collected, 0),
    planned: summary.reduce((sum, group) => sum + group.planned, 0),
  };
}

/** Inclusive calendar-month bounds as YYYY-MM-DD strings. */
export function monthPeriod(year: number, month: number): { period_start: string; period_end: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    period_start: `${year}-${pad(month)}-01`,
    period_end: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/** Day bounds (inclusive) for a [start,end) ISO window covering one local Tashkent day. */
export function dateBoundsIso(periodStart: string, periodEnd: string): { from: string; to: string } {
  // TZ offset for Asia/Tashkent is fixed UTC+5 (no DST).
  const from = shiftIsoDay(periodStart, 0);
  const to = shiftIsoDay(periodEnd, 1);
  return { from, to };
}

function shiftIsoDay(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const utc = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) + deltaDays * 86400000;
  const date = new Date(utc);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T00:00:00+05:00`;
}

export type PayrollExpense = {
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  note: string;
};

/**
 * A paid statement is a real cash outflow, so it has to reach the finance ledger
 * (brief 5.7). Nothing is paid when the total is zero or negative, so no row.
 */
export function buildPayrollExpense(input: {
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  paymentMethod: string;
  paidAt: Date;
}): PayrollExpense | null {
  const amount = roundMoney(input.amount);
  if (!(amount > 0)) return null;
  return {
    category: "salary",
    amount,
    expense_date: localDay(input.paidAt),
    payment_method: input.paymentMethod,
    note: `Oylik: ${input.employeeName} (${input.periodStart}…${input.periodEnd})`,
  };
}

/** Calendar day in Asia/Tashkent (UTC+5, no DST) as YYYY-MM-DD. */
export function localDay(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
}
