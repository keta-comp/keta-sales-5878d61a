import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { ATTENDANCE_STATUSES, shiftDayIso } from "./attendance";
import { requireBusinessId } from "./tenant.server";

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD ko‘rinishida bo‘lsin");
const GROUP = z.string().trim().max(80);
const CONFLICT = "business_id, student_id, lesson_date, group_name";

/** Ro'yxat: darsga yozilgan o'quvchilar (faqat faol/VIP — lead'lar davomatga kirmaydi). */
export const getAttendanceDay = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ date: DAY, group: GROUP.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const group = data.group ?? "";
    const from = shiftDayIso(data.date, -60);

    const [{ data: students, error: studentsError }, { data: marks, error: marksError }] =
      await Promise.all([
        context.supabase
          .from("customers")
          .select("id, full_name, phone, status")
          .eq("business_id", businessId)
          .in("status", ["active", "vip"])
          .order("full_name", { ascending: true })
          .limit(2000),
        context.supabase
          .from("attendance")
          .select("student_id, group_name, status, note, lesson_date")
          .eq("business_id", businessId)
          .gte("lesson_date", from)
          .lte("lesson_date", data.date),
      ]);
    if (studentsError) throw new Error(studentsError.message);
    if (marksError) throw new Error(marksError.message);

    const markRows = marks ?? [];
    const groups = [
      ...new Set(markRows.map((row: { group_name: string }) => row.group_name).filter(Boolean)),
    ].sort();
    const dayMarks = markRows.filter(
      (row: { lesson_date: string; group_name: string }) =>
        row.lesson_date === data.date && row.group_name === group,
    );
    const markedBy = new Map(dayMarks.map((row: { student_id: string }) => [row.student_id, row]));

    // Guruh tanlanganda ro'yxat shu guruhda avval belgilangan o'quvchilarga qisqaradi;
    // birinchi darsda (hali belgi yo'q) hammasi ko'rinadi — aks holda bo'sh ekran chiqadi.
    const groupStudents = new Set(
      markRows
        .filter((row: { group_name: string }) => row.group_name === group)
        .map((row: { student_id: string }) => row.student_id),
    );
    const roster = (students ?? [])
      .filter((student: { id: string }) => !group || groupStudents.has(student.id))
      .map((student: { id: string; full_name: string | null; phone: string | null }) => {
        const mark = markedBy.get(student.id) as
          { status: (typeof ATTENDANCE_STATUSES)[number]; note: string } | undefined;
        return {
          id: student.id,
          full_name: student.full_name ?? "",
          phone: student.phone ?? "",
          status: mark?.status ?? null,
          note: mark?.note ?? "",
        };
      });

    return { roster, groups, date: data.date, group };
  });

/** Bir o'quvchining belgisi. `status: null` belgini o'chiradi (qayta o'ylab topilganda). */
export const setAttendanceMark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        studentId: z.string().uuid(),
        date: DAY,
        group: GROUP.optional(),
        status: z.enum(ATTENDANCE_STATUSES).nullable(),
        note: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const group = data.group ?? "";

    if (data.status === null) {
      const { error } = await context.supabase
        .from("attendance")
        .delete()
        .eq("business_id", businessId)
        .eq("student_id", data.studentId)
        .eq("lesson_date", data.date)
        .eq("group_name", group);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }

    const now = new Date().toISOString();
    const { error } = await context.supabase.from("attendance").upsert(
      {
        business_id: businessId,
        student_id: data.studentId,
        lesson_date: data.date,
        group_name: group,
        status: data.status,
        note: data.note ?? "",
        marked_by: context.userId,
        updated_at: now,
      },
      { onConflict: CONFLICT },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** "Barchasini keldi" — ekrandagi ro'yxat bir bosishda yoziladi. */
export const setAttendanceMany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        date: DAY,
        group: GROUP.optional(),
        status: z.enum(ATTENDANCE_STATUSES).nullable(),
        studentIds: z.array(z.string().uuid()).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const group = data.group ?? "";
    if (!data.studentIds.length) return { ok: true as const, count: 0 };

    if (data.status === null) {
      const { error } = await context.supabase
        .from("attendance")
        .delete()
        .eq("business_id", businessId)
        .eq("lesson_date", data.date)
        .eq("group_name", group)
        .in("student_id", data.studentIds);
      if (error) throw new Error(error.message);
      return { ok: true as const, count: data.studentIds.length };
    }

    const now = new Date().toISOString();
    const { error } = await context.supabase.from("attendance").upsert(
      data.studentIds.map((studentId: string) => ({
        business_id: businessId,
        student_id: studentId,
        lesson_date: data.date,
        group_name: group,
        status: data.status,
        marked_by: context.userId,
        updated_at: now,
      })),
      { onConflict: CONFLICT },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, count: data.studentIds.length };
  });

/** Haftalik jadval: 7 kun bo'yicha qisqa statistika (davomat ekrani ustidagi tasma). */
export const getAttendanceWeek = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ date: DAY, group: GROUP.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const from = shiftDayIso(data.date, -6);
    const { data: rows, error } = await context.supabase
      .from("attendance")
      .select("lesson_date, status")
      .eq("business_id", businessId)
      .eq("group_name", data.group ?? "")
      .gte("lesson_date", from)
      .lte("lesson_date", data.date);
    if (error) throw new Error(error.message);

    const perDay: Record<string, { present: number; total: number }> = {};
    for (const row of rows ?? []) {
      const bucket = (perDay[row.lesson_date] ??= { present: 0, total: 0 });
      bucket.total += 1;
      if (row.status === "present" || row.status === "late") bucket.present += 1;
    }
    return perDay;
  });
