import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/lib/auth-middleware";
import { requireBusinessId } from "./tenant.server";

/** Lightweight pickers used by quick-create dialogs (no heavy joins). */
export const listPickers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const { supabaseAdmin } = await import("@/lib/platform.server");
    const [customers, members, orders, products] = await Promise.all([
      context.supabase
        .from("customers")
        .select("id, full_name, phone")
        .order("last_interaction_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("business_members")
        .select("id, user_id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("orders")
        .select("id, order_number, total, customer_id")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("products")
        .select("id, name, price")
        .eq("is_active", true)
        .eq("is_archived", false)
        .limit(200),
    ]);

    // Assignees are team members; names live on profiles, so they are joined here.
    const userIds = (members.data ?? []).map((member) => member.user_id);
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] };
    const nameBy = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "A’zo"]));
    const assignees = (members.data ?? []).map((member) => ({
      id: member.id,
      full_name: nameBy.get(member.user_id) ?? "A’zo",
    }));

    return {
      customers: customers.data ?? [],
      assignees,
      orders: orders.data ?? [],
      products: products.data ?? [],
    };
  });

export const createQuickLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        customer_id: z.string(),
        requested_product: z.string().nullable().optional(),
        source: z.string().default("manual"),
        value: z.number().nonnegative().default(0),
        stage: z.string().nullable().optional(),
        next_action: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        assigned_member_id: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { logActivity } = await import("./activity.server");
    const { data: created, error } = await context.supabase
      .from("leads")
      .insert({ ...data, last_contact_at: new Date().toISOString() } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, {
      entityType: "lead",
      entityId: created.id,
      customerId: data.customer_id,
      action: "lead_created",
      detail: data.requested_product ?? "Yangi murojaat",
      actorUserId: context.userId,
    });
    return created;
  });

export const updateLeadStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string(), stage: z.string(), customer_id: z.string().nullable().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { logActivity } = await import("./activity.server");
    const { error } = await context.supabase
      .from("leads")
      .update({ stage: data.stage, last_contact_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context.supabase, {
      entityType: "lead",
      entityId: data.id,
      customerId: data.customer_id ?? null,
      action: "lead_stage_changed",
      detail: data.stage,
      actorUserId: context.userId,
    });
    return { ok: true };
  });

export const createQuickOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        customer_id: z.string(),
        lead_id: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        delivery_address: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        discount: z.number().nonnegative().default(0),
        assigned_member_id: z.string().nullable().optional(),
        items: z
          .array(
            z.object({
              product_id: z.string().nullable().optional(),
              product_name: z.string().min(1),
              quantity: z.number().int().positive(),
              unit_price: z.number().nonnegative(),
            }),
          )
          .min(1, "Kamida bitta qator kerak"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { logActivity } = await import("./activity.server");
    const lines = data.items.map((item) => ({
      product_id: item.product_id ?? null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.unit_price * item.quantity,
    }));
    const gross = lines.reduce((sum, l) => sum + l.line_total, 0);
    const total = Math.max(gross - data.discount, 0);

    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        customer_id: data.customer_id,
        lead_id: data.lead_id ?? null,
        phone: data.phone ?? null,
        delivery_address: data.delivery_address ?? null,
        notes: data.notes ?? null,
        assigned_member_id: data.assigned_member_id ?? null,
        discount: data.discount,
        total,
      } as never)
      .select("id, order_number")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemError } = await context.supabase
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })) as never);
    if (itemError) throw new Error(itemError.message);

    await logActivity(context.supabase, {
      entityType: "order",
      entityId: order.id,
      customerId: data.customer_id,
      action: "order_created",
      detail: `Buyurtma #${order.order_number} yaratildi`,
      actorUserId: context.userId,
    });

    const { notifyCurrentBusiness } = await import("./telegram-notify.server");
    await notifyCurrentBusiness(
      context.supabase as never,
      "new_order",
      `🛒 <b>Yangi buyurtma</b>\n#${order.order_number} — ${Math.round(total).toLocaleString("ru-RU")}`,
    );
    return order;
  });
