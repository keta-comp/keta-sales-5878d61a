import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withAssigneeNames } from "./assignee.server";
import { compact } from "./compact";

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      customerId: z.string().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("orders")
      .select(
        "*, customers(id, full_name, telegram_username), order_items(id, product_name, quantity, unit_price, line_total)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status && data.status !== "all") query = query.eq("status", data.status as never);
    if (data.customerId) query = query.eq("customer_id", data.customerId);
    if (data.search) query = query.ilike("order_number", `%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return withAssigneeNames(context.supabase, rows ?? []);
  });

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        status: z
          .enum(["new", "confirming", "confirmed", "preparing", "delivered", "cancelled"])
          .optional(),
        payment_status: z.enum(["unpaid", "partial", "paid", "refunded"]).optional(),
        assigned_member_id: z.string().nullable().optional(),
        delivery_address: z.string().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: current, error: readError } = await context.supabase
      .from("orders")
      .select("status, stock_applied")
      .eq("id", id)
      .single();
    if (readError) throw new Error(readError.message);

    // Inventory is applied exactly once, transactionally, inside the database.
    const confirming = ["confirmed", "preparing", "delivered"];
    if (patch.status && confirming.includes(patch.status) && !current.stock_applied) {
      const { error } = await context.supabase.rpc("apply_order_stock", {
        _order_id: id,
        _actor: context.userId,
      });
      if (error) throw new Error(error.message);
    }
    if (patch.status === "cancelled" && current.stock_applied) {
      const { error } = await context.supabase.rpc("revert_order_stock", {
        _order_id: id,
        _actor: context.userId,
      });
      if (error) throw new Error(error.message);
    }

    const { error } = await context.supabase.from("orders").update(compact(patch) as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        customer_id: z.string(),
        phone: z.string().optional(),
        delivery_address: z.string().optional(),
        notes: z.string().optional(),
        items: z
          .array(z.object({ product_id: z.string(), quantity: z.number().int().positive() }))
          .min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: products, error: productError } = await context.supabase
      .from("products")
      .select("id, name, sku, price")
      .in(
        "id",
        data.items.map((i) => i.product_id),
      );
    if (productError) throw new Error(productError.message);

    const lines = data.items.map((item) => {
      const product = products?.find((p) => p.id === item.product_id);
      if (!product) throw new Error("Product not found");
      return {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unit_price: Number(product.price),
        line_total: Number(product.price) * item.quantity,
      };
    });
    const total = lines.reduce((sum, l) => sum + l.line_total, 0);

    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        customer_id: data.customer_id,
        phone: data.phone ?? null,
        delivery_address: data.delivery_address ?? null,
        notes: data.notes ?? null,
        total,
      })
      .select("id, order_number")
      .single();
    if (error) throw new Error(error.message);

    const { error: itemError } = await context.supabase
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (itemError) throw new Error(itemError.message);
    return order;
  });
