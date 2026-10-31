import { createServerFn } from "@tanstack/react-start";
import type { DbClient } from "./pg-rest.server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { can, type MemberRole } from "./roles";
import { requireBusinessId } from "./tenant.server";

type Client = DbClient;

/** Staff records are managed by owner/admin/manager (catalog.manage gate). */
async function requireStaffAdmin(supabase: Client): Promise<string> {
  const businessId = await requireBusinessId(supabase);
  const { data: role, error } = await supabase.rpc("business_role", { _business_id: businessId });
  if (error) throw new Error(error.message);
  if (!can(role as MemberRole | null, "catalog.manage")) {
    throw new Error("Xodimlarni faqat egasi, admin yoki menejer boshqaradi.");
  }
  return businessId;
}

const timeInput = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

/**
 * RLS chet biznesning qatorini o'qishga yoki bo'yashga to'sadi, lekin bizning
 * qatorimizga begona ID yozishni to'xtatmaydi. Bog'lanadigan jadval ID'sini
 * shu yerdan tekshiramiz: topilmasa — yozuvni umuman ochmaymiz.
 */
async function assertOwnRecord(
  supabase: Client,
  businessId: string,
  table: "branches" | "employees" | "services",
  id: string,
  label: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${label} topilmadi — ro'yxatdan qayta tanlang.`);
}

/* -------------------------------- employees ------------------------------- */

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ includeInactive: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireBusinessId(context.supabase);
    let query = context.supabase
      .from("employees")
      .select("*, branches(id, name)")
      .order("full_name", { ascending: true });
    if (!data.includeInactive) query = query.eq("is_active", true);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        full_name: z.string().trim().min(1).max(120),
        position: z.string().max(120).optional(),
        phone: z.string().max(40).optional(),
        email: z.string().email().or(z.literal("")).optional(),
        hired_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        branch_id: z.string().uuid().nullable().optional(),
        user_id: z.string().uuid().nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireStaffAdmin(context.supabase);
    if (data.branch_id) {
      await assertOwnRecord(context.supabase, businessId, "branches", data.branch_id, "Filial");
    }
    const row = {
      full_name: data.full_name,
      position: data.position ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      hired_on: data.hired_on ?? null,
      branch_id: data.branch_id ?? null,
      user_id: data.user_id ?? null,
    };
    if (data.id) {
      const patch = data.is_active === undefined ? row : { ...row, is_active: data.is_active };
      const { error } = await context.supabase.from("employees").update(patch).eq("id", data.id);
      if (error) {
        if (error.code === "23505") throw new Error("Bu tizim foydalanuvchiga allaqachon xodim yaratilgan.");
        throw new Error(error.message);
      }
    } else {
      const { error } = await context.supabase.from("employees").insert({
        ...row,
        is_active: data.is_active ?? true,
        business_id: businessId,
        created_by: context.userId,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Bu tizim foydalanuvchiga allaqachon xodim yaratilgan.");
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaffAdmin(context.supabase);
    const { error } = await context.supabase.from("employees").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------- service capabilities ---------------------------- */

export const getEmployeeServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireBusinessId(context.supabase);
    const { data: rows, error } = await context.supabase
      .from("employee_services")
      .select("service_id")
      .eq("employee_id", data.employeeId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.service_id);
  });

export const setEmployeeServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: z.string(), serviceIds: z.array(z.string().uuid()).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireStaffAdmin(context.supabase);
    await assertOwnRecord(context.supabase, businessId, "employees", data.employeeId, "Xodim");
    const serviceIds = [...new Set(data.serviceIds)];
    if (serviceIds.length) {
      const { data: ownServices, error: serviceError } = await context.supabase
        .from("services")
        .select("id")
        .eq("business_id", businessId)
        .in("id", serviceIds);
      if (serviceError) throw new Error(serviceError.message);
      if ((ownServices ?? []).length !== serviceIds.length) {
        throw new Error("Xizmatlardan biri topilmadi — ro'yxatdan qayta tanlang.");
      }
    }
    const { error: delError } = await context.supabase
      .from("employee_services")
      .delete()
      .eq("employee_id", data.employeeId);
    if (delError) throw new Error(delError.message);
    if (serviceIds.length) {
      const { error } = await context.supabase.from("employee_services").insert(
        serviceIds.map((serviceId) => ({
          employee_id: data.employeeId,
          service_id: serviceId,
          business_id: businessId,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/**
 * Xizmat bo'yicha uni bajaradigan ustalar — katalog sahifasi qamrov shu yerdan
 * ko'rsatadi («bu xizmatni hech kim bilmaydi» holati ochiq qolmasin).
 */
export const listServiceTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const [links, people] = await Promise.all([
      context.supabase
        .from("employee_services")
        .select("service_id, employee_id")
        .eq("business_id", businessId),
      context.supabase
        .from("employees")
        .select("id, full_name")
        .eq("business_id", businessId)
        .eq("is_active", true),
    ]);
    if (links.error) throw new Error(links.error.message);
    if (people.error) throw new Error(people.error.message);
    const names = new Map((people.data ?? []).map((person) => [person.id, person.full_name]));
    return (links.data ?? []).flatMap((link) => {
      const fullName = names.get(link.employee_id);
      return fullName ? [{ serviceId: link.service_id, employeeId: link.employee_id, fullName }] : [];
    });
  });

/* ------------------------------- work schedule ------------------------------ */

export const getWorkSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ employeeId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireBusinessId(context.supabase);
    const { data: rows, error } = await context.supabase
      .from("work_schedules")
      .select("*")
      .eq("employee_id", data.employeeId)
      .order("weekday", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveWorkSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        employee_id: z.string(),
        weekday: z.number().int().min(1).max(7),
        start_time: timeInput,
        end_time: timeInput,
        break_start: timeInput.nullable().optional(),
        break_end: timeInput.nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireStaffAdmin(context.supabase);
    await assertOwnRecord(context.supabase, businessId, "employees", data.employee_id, "Xodim");
    if (data.end_time <= data.start_time) throw new Error("Tugash vaqti boshlanishdan keyin bo'lishi kerak.");
    if ((data.break_start && !data.break_end) || (!data.break_start && data.break_end)) {
      throw new Error("Tanaffus boshlanishi va tugashi birga to'ldiriladi.");
    }
    const row = {
      employee_id: data.employee_id,
      weekday: data.weekday,
      start_time: data.start_time,
      end_time: data.end_time,
      break_start: data.break_start ?? null,
      break_end: data.break_end ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("work_schedules").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("work_schedules")
        .insert({ ...row, business_id: businessId });
      if (error) {
        if (error.code === "23505") throw new Error("Bu kunning jadvali allaqachon mavjud.");
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const deleteWorkSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaffAdmin(context.supabase);
    const { error } = await context.supabase.from("work_schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- time off -------------------------------- */

export const listTimeOff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ employeeId: z.string().optional(), from: z.string().datetime().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireBusinessId(context.supabase);
    let query = context.supabase.from("time_off").select("*").order("starts_at", { ascending: true }).limit(200);
    if (data.employeeId) query = query.eq("employee_id", data.employeeId);
    if (data.from) query = query.gte("ends_at", data.from);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addTimeOff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employee_id: z.string(),
        starts_at: z.string().datetime(),
        ends_at: z.string().datetime(),
        reason: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireStaffAdmin(context.supabase);
    await assertOwnRecord(context.supabase, businessId, "employees", data.employee_id, "Xodim");
    if (data.ends_at <= data.starts_at) throw new Error("Tugash vaqti boshlanishdan keyin bo'lishi kerak.");
    const { error } = await context.supabase.from("time_off").insert({
      employee_id: data.employee_id,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      reason: data.reason ?? "",
      business_id: businessId,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTimeOff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireStaffAdmin(context.supabase);
    const { error } = await context.supabase.from("time_off").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
