import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { requirePermission } from "./guards.server";
import { withAssigneeName, withAssigneeNames } from "./assignee.server";
import { compact } from "./compact";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.string().optional(),
        score: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("leads")
      .select("*, customers(id, full_name, telegram_username, phone, location), products(id, name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status && data.status !== "all") query = query.eq("status", data.status as never);
    if (data.score && data.score !== "all") query = query.eq("score", data.score as never);
    if (data.search) query = query.ilike("requested_product", `%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return withAssigneeNames(context.supabase, rows ?? []);
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const [lead, events] = await Promise.all([
      context.supabase.from("leads").select("*, customers(*)").eq("id", data.id).single(),
      context.supabase
        .from("lead_events")
        .select("*")
        .eq("lead_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (lead.error) throw new Error(lead.error.message);
    const enriched = await withAssigneeName(context.supabase, lead.data);
    return { lead: enriched, events: events.data ?? [] };
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        status: z
          .enum(["new", "needs_attention", "assigned", "contacted", "negotiating", "won", "lost"])
          .optional(),
        score: z.enum(["hot", "warm", "cold"]).optional(),
        assigned_member_id: z.string().nullable().optional(),
        notes: z.string().optional(),
        phone: z.string().optional(),
        budget: z.string().optional(),
        location: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(
      context.supabase,
      "sales.manage",
      "Sotuv va to'lovlarni faqat ruxsatli xodimlar yuritadi.",
    );
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("leads")
      .update(compact(patch) as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    if (patch.assigned_member_id) {
      await context.supabase
        .from("lead_assignments")
        .upsert(
          { lead_id: id, member_id: patch.assigned_member_id, assigned_by: context.userId },
          { onConflict: "lead_id,member_id" },
        );
    }
    await context.supabase.from("lead_events").insert({
      lead_id: id,
      event_type: "lead_updated",
      detail: Object.keys(patch).join(", "),
      actor: "staff",
    });
    return { ok: true };
  });

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("customers")
      .select("*")
      .order("last_interaction_at", { ascending: false })
      .limit(300);
    if (data.search)
      query = query.or(
        `full_name.ilike.%${data.search}%,telegram_username.ilike.%${data.search}%,phone.ilike.%${data.search}%`,
      );
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows;
  });

export const getCustomer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const [customer, leads, orders, conversations] = await Promise.all([
      context.supabase.from("customers").select("*").eq("id", data.id).single(),
      context.supabase
        .from("leads")
        .select("*")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("orders")
        .select("*")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("conversations")
        .select("*")
        .eq("customer_id", data.id)
        .order("last_message_at", { ascending: false }),
    ]);
    if (customer.error) throw new Error(customer.error.message);
    return {
      customer: customer.data,
      leads: leads.data ?? [],
      orders: orders.data ?? [],
      conversations: conversations.data ?? [],
    };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        full_name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(
      context.supabase,
      "sales.manage",
      "Sotuv va to'lovlarni faqat ruxsatli xodimlar yuritadi.",
    );
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("customers")
      .update(compact(patch) as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
