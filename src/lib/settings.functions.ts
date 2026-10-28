import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { compact } from "./compact";

/** Settings writes are admin-only (enforced by RLS too — this gives a clear message). */
async function requireBusinessAdmin(supabase: SupabaseClient<Database>): Promise<string> {
  const { requireBusinessId } = await import("./tenant.server");
  const businessId = await requireBusinessId(supabase);
  const { data, error } = await supabase.rpc("is_business_admin", { _business_id: businessId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Faqat egasi yoki admin sozlamalarni o'zgartira oladi.");
  return businessId;
}

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const businessId = await requireBusinessId(context.supabase);
    const [business, ai, adminFlag] = await Promise.all([
      context.supabase.from("business_settings").select("*").limit(1).maybeSingle(),
      context.supabase.from("ai_settings").select("*").limit(1).maybeSingle(),
      context.supabase.rpc("is_business_admin", { _business_id: businessId }),
    ]);
    if (business.error) throw new Error(business.error.message);
    if (ai.error) throw new Error(ai.error.message);
    return {
      businessId,
      business: business.data,
      ai: ai.data,
      aiKeyConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
      isAdmin: adminFlag.data === true,
    };
  });

export const saveBusinessSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        business_name: z.string().min(1),
        business_description: z.string(),
        working_hours: z.string(),
        delivery_info: z.string(),
        payment_methods: z.string(),
        return_policy: z.string(),
        currency: z.string().min(1).max(8),
        staff_group_chat_id: z.string().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const businessId = await requireBusinessAdmin(context.supabase);
    const { error } = await context.supabase
      .from("business_settings")
      .update(compact(patch) as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    const { invalidateSettingsCache } = await import("./agent.server");
    invalidateSettingsCache(businessId);
    return { ok: true };
  });

/** Branding shown on the public booking page: contact phone and the stored logo path. */
export const saveBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        phone: z.string().max(40).optional(),
        logo_path: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessAdmin(context.supabase);
    const { error } = await context.supabase
      .from("business_settings")
      .update(compact(data) as never)
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAiSettings = createServerFn({ method: "POST" })  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        model: z.string().min(1),
        tone_of_voice: z.string(),
        sales_strategy: z.string(),
        language_instruction: z.string(),
        escalation_rules: z.string(),
        custom_instructions: z.string(),
        max_discount_percent: z.number().min(0).max(100),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const businessId = await requireBusinessAdmin(context.supabase);
    const { error } = await context.supabase
      .from("ai_settings")
      .update(compact(patch) as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    const { invalidateSettingsCache } = await import("./agent.server");
    invalidateSettingsCache(businessId);
    return { ok: true };
  });

export const notifyLeadStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ leadId: z.string(), reason: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const { notifyStaffGroup } = await import("./agent.server");
    const businessId = await requireBusinessId(context.supabase);
    return notifyStaffGroup(businessId, data.leadId, data.reason);
  });