import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/lib/auth-middleware";

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildOverview } = await import("./stats.server");
    return buildOverview(context.supabase);
  });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildAnalytics } = await import("./stats.server");
    return buildAnalytics(context.supabase);
  });