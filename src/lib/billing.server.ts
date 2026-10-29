import { createHash } from "node:crypto";

import { extendSubscription, hasFeature, type Feature } from "./billing";

export function md5(s: string) {
  return createHash("md5").update(s).digest("hex");
}

type Admin = Awaited<typeof import("@/lib/platform.server")>["supabaseAdmin"];

export async function getAdmin(): Promise<Admin> {
  return (await import("@/lib/platform.server")).supabaseAdmin;
}

/** Marks invoice paid and extends the workspace subscription. Idempotent. */
export async function activateInvoice(admin: Admin, invoiceId: string) {
  const { data: inv } = await admin.from("billing_invoices").select("*").eq("id", invoiceId).single();
  if (!inv || inv.status === "paid") return;
  const { data: biz } = await admin
    .from("businesses")
    .select("subscription_ends_at")
    .eq("id", inv.business_id)
    .single();
  await admin
    .from("billing_invoices")
    .update({ status: "paid", perform_time: new Date().toISOString() })
    .eq("id", invoiceId);
  await admin
    .from("businesses")
    .update({ plan: inv.plan, subscription_ends_at: extendSubscription(biz?.subscription_ends_at) })
    .eq("id", inv.business_id);
}

/** Throws when the caller's workspace plan does not include the feature. */
export async function assertFeature(supabase: { rpc: (fn: "my_access_state") => PromiseLike<{ data: unknown }> }, feature: Feature) {
  const { data } = await supabase.rpc("my_access_state");
  if (!hasFeature((data ?? {}) as never, feature)) {
    throw new Error("Bu imkoniyat joriy tarifingizda mavjud emas. Tarifni yangilang.");
  }
}
