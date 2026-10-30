/**
 * Eslatma skanerini bir marta ishga tushiradi (cron nuqtasi shu funksiyani chaqiradi).
 *
 * Yuborish manzili — biznesning faol Telegram bog'lanishlari va ulardagi bayroqlar:
 * qabul eslatmasi `notify_booking`, muddati o'tgan to'lov eslatmasi `notify_payment`
 * orqali. Bayroqni yoqmagangan biznesga hech narsa ketmaydi.
 *
 * Takrorlanishning oldini yozuvning `data` jsonb ustunidagi belgi oladi (yangi
 * jadval kerak emas): qabulda `reminder_sent_at`, to'lovda `reminder_sent_for`.
 */
import { formatMoney } from "./types";
import {
  APPOINTMENT_LEAD_MINUTES,
  APPOINTMENT_LATE_GRACE_MINUTES,
  appointmentReminderDue,
  localDateKey,
  localTime,
  paymentReminderDue,
  withPaymentMark,
  withReminderMark,
  type ReminderMark,
} from "./reminders";

export interface ReminderScanResult {
  booking: number;
  payment: number;
  /** Manzil (faol Telegram bog'lanishi) bo'lmagani uchun belgi qo'ymay qoldirilgan yozuvlar. */
  skipped: number;
  error?: string;
}

type Marked = ReminderMark & Record<string, unknown>;
type Customer = { full_name?: string | null } | null;

interface AppointmentRow {
  id: string;
  business_id: string;
  starts_at: string;
  service_name: string | null;
  data: Marked | null;
  customers: Customer;
}

interface PaymentRow {
  id: string;
  business_id: string;
  amount: number | string | null;
  due_date: string | null;
  data: Marked | null;
  customers: Customer;
}

function groupByBusiness<T extends { business_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.business_id);
    if (list) list.push(row);
    else map.set(row.business_id, [row]);
  }
  return map;
}

export async function runReminderScan(now: Date = new Date()): Promise<ReminderScanResult> {
  const [{ supabaseAdmin }, { notifyBusiness }] = await Promise.all([
    import("@/lib/platform.server"),
    import("@/lib/telegram-notify.server"),
  ]);

  const sentAt = now.toISOString();
  const windowFrom = new Date(now.getTime() - APPOINTMENT_LATE_GRACE_MINUTES * 60_000).toISOString();
  const windowTo = new Date(now.getTime() + APPOINTMENT_LEAD_MINUTES * 60_000).toISOString();
  const todayKey = localDateKey(now);

  const [appointmentRows, paymentRows] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("id, business_id, starts_at, status, service_name, data, customers(full_name)")
      .gte("starts_at", windowFrom)
      .lte("starts_at", windowTo)
      .in("status", ["new", "confirmed"])
      .limit(500),
    supabaseAdmin
      .from("payments")
      .select("id, business_id, amount, due_date, status, data, customers(full_name)")
      .eq("status", "pending")
      .lte("due_date", todayKey)
      .limit(500),
  ]);

  if (appointmentRows.error || paymentRows.error) {
    return {
      booking: 0,
      payment: 0,
      skipped: 0,
      error: appointmentRows.error?.message ?? paymentRows.error?.message ?? "Skaner xatoligi",
    };
  }

  let skipped = 0;

  let booking = 0;
  const dueAppointments = (appointmentRows.data ?? []) as unknown as AppointmentRow[];
  for (const [businessId, rows] of groupByBusiness(
    dueAppointments.filter((row) => appointmentReminderDue(row, now)),
  )) {
    const lines = rows.map((row) => {
      const who = row.customers?.full_name || "Mijozsiz";
      return `• ${localTime(row.starts_at)} — ${who}${row.service_name ? ` (${row.service_name})` : ""}`;
    });
    const delivered = await notifyBusiness(businessId, "booking", `Eslatma: yaqin qabullar\n${lines.join("\n")}`);
    if (!delivered) {
      skipped += rows.length;
      continue;
    }
    for (const row of rows) {
      const { error } = await supabaseAdmin
        .from("appointments")
        .update({ data: withReminderMark(row.data, sentAt) })
        .eq("id", row.id);
      if (!error) booking += 1;
    }
  }

  let payment = 0;
  const overduePayments = (paymentRows.data ?? []) as unknown as PaymentRow[];
  for (const [businessId, rows] of groupByBusiness(
    overduePayments.filter((row) => paymentReminderDue(row, todayKey)),
  )) {
    const total = rows.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
    const names = rows.map((row) => row.customers?.full_name).filter(Boolean).slice(0, 5);
    const delivered = await notifyBusiness(
      businessId,
      "payment",
      `Eslatma: muddati o‘tgan ${rows.length} ta to‘lov — ${formatMoney(total)}${names.length ? `\n${names.join(", ")}` : ""}`,
    );
    if (!delivered) {
      skipped += rows.length;
      continue;
    }
    for (const row of rows) {
      const { error } = await supabaseAdmin
        .from("payments")
        .update({ data: withPaymentMark(row.data, String(row.due_date), sentAt) })
        .eq("id", row.id);
      if (!error) payment += 1;
    }
  }

  return { booking, payment, skipped };
}
