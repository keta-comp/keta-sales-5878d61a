import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS } from "./billing";

export const getBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: state }, { data: invoices }] = await Promise.all([
      context.supabase.rpc("my_access_state"),
      context.supabase
        .from("billing_invoices")
        .select("id, invoice_no, plan, amount, provider, status, created_at, perform_time")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const s = (state ?? {}) as Record<string, unknown>;
    return {
      plan: (s.plan as string | null) ?? null,
      trial_ends_at: (s.trial_ends_at as string | null) ?? null,
      subscription_ends_at: (s.subscription_ends_at as string | null) ?? null,
      is_super_admin: Boolean(s.is_super_admin),
      invoices: invoices ?? [],
      providers: {
        payme: Boolean(process.env["PAYME_MERCHANT_ID"] && process.env["PAYME_KEY"]),
        click: Boolean(
          process.env["CLICK_SERVICE_ID"] && process.env["CLICK_MERCHANT_ID"] && process.env["CLICK_SECRET_KEY"],
        ),
      },
    };
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        plan: z.enum(["start", "pro", "max"]),
        provider: z.enum(["payme", "click"]),
        returnUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const { getAdmin } = await import("./billing.server");
    const businessId = await requireBusinessId(context.supabase);
    const amount = PLANS[data.plan].price;

    if (data.provider === "payme" && !process.env["PAYME_MERCHANT_ID"]) {
      throw new Error("Payme hali ulanmagan.");
    }
    if (data.provider === "click" && !process.env["CLICK_SERVICE_ID"]) {
      throw new Error("Click hali ulanmagan.");
    }

    const admin = await getAdmin();
    const { data: inv, error } = await admin
      .from("billing_invoices")
      .insert({ business_id: businessId, plan: data.plan, amount, provider: data.provider, created_by: context.userId })
      .select("id, invoice_no")
      .single();
    if (error) throw new Error(error.message);

    if (data.provider === "payme") {
      const params = `m=${process.env["PAYME_MERCHANT_ID"]};ac.invoice_id=${inv.invoice_no};a=${amount * 100};c=${data.returnUrl}`;
      const base = process.env["PAYME_TEST"] === "1" ? "https://test.paycom.uz" : "https://checkout.paycom.uz";
      return { url: `${base}/${btoa(params)}` };
    }
    const q = new URLSearchParams({
      service_id: process.env["CLICK_SERVICE_ID"]!,
      merchant_id: process.env["CLICK_MERCHANT_ID"]!,
      amount: String(amount),
      transaction_param: String(inv.invoice_no),
      return_url: data.returnUrl,
    });
    return { url: `https://my.click.uz/services/pay?${q}` };
  });
