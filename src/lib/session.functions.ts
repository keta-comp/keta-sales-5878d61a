import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Successful sign-in: trustworthy, the caller is authenticated. */
export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./audit.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: membership } = await supabaseAdmin
      .from("business_members")
      .select("business_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    await supabaseAdmin
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", context.userId);

    await logAudit({
      actorUserId: context.userId,
      actorEmail: profile?.email ?? null,
      action: "login",
      targetType: "user",
      targetId: context.userId,
      businessId: membership?.business_id ?? null,
    });
    return { ok: true };
  });

/** Failed sign-in. Only the email is ever recorded — never the password. */
export const recordFailedLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./audit.server");

    // Throttle: this endpoint is anonymous, so cap per-email writes to prevent audit-log spam.
    const email = data.email.slice(0, 200).toLowerCase();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "login_failed")
      .ilike("actor_email", email)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) return { ok: true };

    await logAudit({
      actorEmail: email,
      actorKind: "system",
      action: "login_failed",
      status: "failure",
    });
    return { ok: true };
  });

/** New account created through the public sign-up form. */
export const recordRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("./audit.server");

    const { data: membership } = await supabaseAdmin
      .from("business_members")
      .select("business_id, businesses(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await logAudit({
      actorUserId: context.userId,
      actorEmail: profile?.email ?? null,
      action: "user_registered",
      targetType: "user",
      targetId: context.userId,
      businessId: membership?.business_id ?? null,
      metadata: { organization: (membership as { businesses?: { name?: string } } | null)?.businesses?.name ?? null },
    });

    if (membership?.business_id) {
      await logAudit({
        actorUserId: context.userId,
        actorEmail: profile?.email ?? null,
        action: "organization_created",
        targetType: "organization",
        targetId: membership.business_id,
        businessId: membership.business_id,
      });
    }
    return { ok: true };
  });
