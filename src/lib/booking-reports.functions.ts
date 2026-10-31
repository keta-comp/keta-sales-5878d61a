import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { logActivity } from "./activity.server";
import { can, type MemberRole } from "./roles";
import { requireBusinessId } from "./tenant.server";
import { roundMoney } from "./payroll";

const rangeInput = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const APPOINTMENT_REPORT_SELECT =
  "starts_at, ends_at, status, price, service_name, customers:customer_id(full_name, phone), employees:employee_id(full_name)";

type ReportRow = {
  starts_at: string;
  ends_at: string;
  status: string;
  price: number | null;
  service_name: string | null;
  customers: { full_name: string | null; phone: string | null } | null;
  employees: { full_name: string | null } | null;
};

function localDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
}

export const getBookingReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rangeInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireBusinessId(context.supabase);
    const { data: rows, error } = await context.supabase
      .from("appointments")
      .select(APPOINTMENT_REPORT_SELECT)
      .gte("starts_at", data.from)
      .lt("starts_at", data.to)
      .order("starts_at", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    const items = (rows ?? []) as unknown as ReportRow[];

    const completed = items.filter((row) => row.status === "completed");
    const cancelled = items.filter((row) => row.status === "cancelled");
    const noShow = items.filter((row) => row.status === "no_show");
    const pending = items.filter((row) => row.status === "new" || row.status === "confirmed" || row.status === "arrived");
    const revenue = completed.reduce((sum, row) => sum + Number(row.price ?? 0), 0);
    const attendedBase = completed.length + noShow.length;

    const byService = new Map<string, { count: number; revenue: number }>();
    const byEmployee = new Map<string, { count: number; revenue: number; noShow: number }>();
    const byDay = new Map<string, { booked: number; completed: number; revenue: number }>();

    for (const row of items) {
      const day = localDay(row.starts_at);
      const dayEntry = byDay.get(day) ?? { booked: 0, completed: 0, revenue: 0 };
      if (row.status !== "cancelled") dayEntry.booked += 1;
      if (row.status === "completed") {
        dayEntry.completed += 1;
        dayEntry.revenue += Number(row.price ?? 0);
      }
      byDay.set(day, dayEntry);
    }
    for (const row of completed) {
      const price = Number(row.price ?? 0);
      const serviceName = row.service_name ?? "Xizmatsiz";
      const serviceEntry = byService.get(serviceName) ?? { count: 0, revenue: 0 };
      serviceEntry.count += 1;
      serviceEntry.revenue += price;
      byService.set(serviceName, serviceEntry);

      const employeeName = row.employees?.full_name ?? "Biriktirilmagan";
      const employeeEntry = byEmployee.get(employeeName) ?? { count: 0, revenue: 0, noShow: 0 };
      employeeEntry.count += 1;
      employeeEntry.revenue += price;
      byEmployee.set(employeeName, employeeEntry);
    }
    for (const row of noShow) {
      const employeeName = row.employees?.full_name ?? "Biriktirilmagan";
      const employeeEntry = byEmployee.get(employeeName) ?? { count: 0, revenue: 0, noShow: 0 };
      employeeEntry.noShow += 1;
      byEmployee.set(employeeName, employeeEntry);
    }

    const pct = (value: number, base: number) => (base > 0 ? Math.round((value / base) * 1000) / 10 : null);

    return {
      kpis: {
        total: items.length,
        completed: completed.length,
        cancelled: cancelled.length,
        noShow: noShow.length,
        pending: pending.length,
        revenue: roundMoney(revenue),
        showRate: pct(completed.length, attendedBase),
        cancelRate: pct(cancelled.length, items.length),
        noShowRate: pct(noShow.length, items.length),
      },
      byService: [...byService.entries()]
        .map(([name, value]) => ({ name, count: value.count, revenue: roundMoney(value.revenue) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 12),
      byEmployee: [...byEmployee.entries()]
        .map(([name, value]) => ({ name, count: value.count, revenue: roundMoney(value.revenue), noShow: value.noShow }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 12),
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, booked: value.booked, completed: value.completed, revenue: roundMoney(value.revenue) })),
    };
  });

/* --------------------------------- CSV export ------------------------------- */

/** Exports the raw appointment ledger for the period. Gated by reports.export + audited. */
export const exportBookingCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rangeInput.parse(input))
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const { data: role, error: roleError } = await context.supabase.rpc("business_role", { _business_id: businessId });
    if (roleError) throw new Error(roleError.message);
    if (!can(role as MemberRole | null, "reports.export")) {
      throw new Error("Hisobot eksporti uchun ruxsat yo'q.");
    }
    const { assertFeature } = await import("./billing.server");
    await assertFeature(context.supabase, "excel_export");

    const { data: rows, error } = await context.supabase
      .from("appointments")
      .select(APPOINTMENT_REPORT_SELECT)
      .gte("starts_at", data.from)
      .lt("starts_at", data.to)
      .order("starts_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    const items = (rows ?? []) as unknown as ReportRow[];
    // Eksport moliyaviy hujjat: ro'yxat kesilib qolsa hisob-kitob noto'g'ri
    // ko'rinadi va buni fayl ichidan bilib bo'lmaydi — shuning uchun to'xtatamiz.
    if (items.length >= 5000) {
      throw new Error(
        "Davr juda katta: 5000 dan ko'p qabul bor. Davrni qisqartirib qayta eksport qiling.",
      );
    }

    // Mijoz/isma `=HYPERLINK(...)` yozib Excel formulani bajarishi mumkin:
    // bunday qiymatlarni apostrof bilan neutrallaymiz.
    const escape = (value: string) => {
      const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const header = ["Sana", "Boshlanish", "Tugash", "Xizmat", "Xodim", "Mijoz", "Telefon", "Holat", "Narx"];
    const lines = [header.join(",")];
    for (const row of items) {
      lines.push(
        [
          localDay(row.starts_at),
          new Date(row.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" }),
          new Date(row.ends_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" }),
          row.service_name ?? "",
          row.employees?.full_name ?? "",
          row.customers?.full_name ?? "",
          row.customers?.phone ?? "",
          row.status,
          String(Number(row.price ?? 0)),
        ]
          .map((value) => escape(String(value)))
          .join(","),
      );
    }
    const csv = `${lines.join("\r\n")}\r\n`;

    await logActivity(context.supabase, {
      entityType: "report",
      action: "booking_csv_exported",
      detail: `${data.from.slice(0, 10)}…${data.to.slice(0, 10)}: ${items.length} yozuv`,
      actorUserId: context.userId,
    });

    return {
      filename: `qabullar-${data.from.slice(0, 10)}-${data.to.slice(0, 10)}.csv`,
      base64: Buffer.from(csv, "utf8").toString("base64"),
    };
  });
