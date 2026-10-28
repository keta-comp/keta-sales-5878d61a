import { createServerFn } from "@tanstack/react-start";
import type { DbClient } from "./pg-rest.server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EXPENSE_CATEGORY_KEYS,
  cashDifference,
  expectedCash,
  groupExpensesByCategory,
  netProfit,
  round2,
  sumAmounts,
} from "./finance";
import { can, type MemberRole } from "./roles";
import { requireBusinessId } from "./tenant.server";

type Client = DbClient;

/** Finance data is restricted to owner/admin/manager — enforced server-side, not just in the UI. */
async function requireFinanceAccess(supabase: Client, permission: "finance.view"): Promise<string> {
  const businessId = await requireBusinessId(supabase);
  const { data: role, error } = await supabase.rpc("business_role", { _business_id: businessId });
  if (error) throw new Error(error.message);
  if (!can(role as MemberRole | null, permission)) {
    throw new Error("Moliya ma'lumotlari faqat egasi, admin va menejer uchun ochiq.");
  }
  return businessId;
}

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/* ------------------------------- expenses ------------------------------- */

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ from: dateInput.optional(), to: dateInput.optional(), category: z.string().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireFinanceAccess(context.supabase, "finance.view");
    let query = context.supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.from) query = query.gte("expense_date", data.from);
    if (data.to) query = query.lte("expense_date", data.to);
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        category: z.string().refine((value) => EXPENSE_CATEGORY_KEYS.includes(value)),
        amount: z.number().positive(),
        expense_date: dateInput,
        payment_method: z.string().min(1).max(20),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireFinanceAccess(context.supabase, "finance.view");
    const { id, ...patch } = data;
    const row = {
      category: patch.category,
      amount: round2(patch.amount),
      expense_date: patch.expense_date,
      payment_method: patch.payment_method,
      note: patch.note ?? "",
    };
    if (id) {
      const { error } = await context.supabase.from("expenses").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("expenses")
        .insert({ ...row, business_id: businessId, created_by: context.userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireFinanceAccess(context.supabase, "finance.view");
    const { data: linked, error: linkError } = await context.supabase
      .from("payroll_statements")
      .select("id")
      .eq("expense_id", data.id)
      .maybeSingle();
    if (linkError) throw new Error(linkError.message);
    if (linked) throw new Error("Bu xarajat oylik hisob-kitobidan yaratilgan — oylikdan o'zgartiriladi.");
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------- cash sessions ---------------------------- */

/** Cash payments received since the session opened (paid/partial rows count as received money). */
async function cashFlowsSince(supabase: Client, sinceIso: string) {
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("method", "cash")
      .in("status", ["paid", "partial"])
      .gte("created_at", sinceIso),
    supabase
      .from("expenses")
      .select("amount")
      .eq("payment_method", "cash")
      .gte("created_at", sinceIso),
  ]);
  return {
    cashIncome: sumAmounts(payments ?? []),
    cashExpense: sumAmounts(expenses ?? []),
  };
}

export const getCashOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFinanceAccess(context.supabase, "finance.view");
    const { data: session, error } = await context.supabase
      .from("cash_sessions")
      .select("*")
      .eq("status", "open")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) return { active: null };

    const { cashIncome, cashExpense } = await cashFlowsSince(context.supabase, session.opened_at);
    return {
      active: {
        ...session,
        cash_income: cashIncome,
        cash_expense: cashExpense,
        expected_cash: expectedCash(Number(session.opening_amount), cashIncome, cashExpense),
      },
    };
  });

export const openCashSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ opening_amount: z.number().nonnegative(), note: z.string().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireFinanceAccess(context.supabase, "finance.view");
    const { error } = await context.supabase.from("cash_sessions").insert({
      business_id: businessId,
      opening_amount: round2(data.opening_amount),
      note: data.note ?? "",
      opened_by: context.userId,
    });
    if (error) {
      // cash_sessions_one_open: one open register session per business.
      if (error.code === "23505") throw new Error("Kassa allaqachon ochilgan.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const closeCashSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ counted_amount: z.number().nonnegative(), note: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireFinanceAccess(context.supabase, "finance.view");
    const { data: session, error } = await context.supabase
      .from("cash_sessions")
      .select("*")
      .eq("status", "open")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) throw new Error("Ochiq kassa topilmadi.");

    const { cashIncome, cashExpense } = await cashFlowsSince(context.supabase, session.opened_at);
    const expected = expectedCash(Number(session.opening_amount), cashIncome, cashExpense);
    const counted = round2(data.counted_amount);

    const { error: updateError } = await context.supabase
      .from("cash_sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: context.userId,
        cash_income: cashIncome,
        cash_expense: cashExpense,
        expected_cash: expected,
        counted_amount: counted,
        difference: cashDifference(expected, counted),
        note: data.note ?? session.note,
      })
      .eq("id", session.id)
      .eq("status", "open");
    if (updateError) throw new Error(updateError.message);
    return { ok: true, expected, counted, difference: cashDifference(expected, counted) };
  });

export const listCashSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFinanceAccess(context.supabase, "finance.view");
    const { data, error } = await context.supabase
      .from("cash_sessions")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* --------------------------------- P&L ---------------------------------- */

export const getPnl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ from: dateInput, to: dateInput }).parse(input))
  .handler(async ({ data, context }) => {
    await requireFinanceAccess(context.supabase, "finance.view");
    const fromIso = `${data.from}T00:00:00.000Z`;
    const toIso = `${data.to}T23:59:59.999Z`;

    const [{ data: payments }, { data: expenses }] = await Promise.all([
      context.supabase
        .from("payments")
        .select("amount, method")
        .in("status", ["paid", "partial"])
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
      context.supabase
        .from("expenses")
        .select("amount, category")
        .gte("expense_date", data.from)
        .lte("expense_date", data.to),
    ]);

    const income = sumAmounts(payments ?? []);
    const byMethod: Record<string, number> = {};
    for (const row of payments ?? []) {
      byMethod[row.method] = round2((byMethod[row.method] ?? 0) + Number(row.amount ?? 0));
    }
    const expensesByCategory = groupExpensesByCategory(expenses ?? []);
    const totalExpenses = round2(Object.values(expensesByCategory).reduce((sum, value) => sum + value, 0));

    return {
      from: data.from,
      to: data.to,
      income,
      incomeByMethod: byMethod,
      totalExpenses,
      expensesByCategory,
      profit: netProfit(income, totalExpenses),
    };
  });
