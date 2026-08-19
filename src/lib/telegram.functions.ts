import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTelegramBot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_telegram_bot");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const active = rows.find((row) => row.is_active) ?? null;
    return {
      bot: active,
      history: rows.filter((row) => !row.is_active).length,
      encryptionConfigured: Boolean(process.env["BOT_TOKEN_ENCRYPTION_KEY"]),
      aiKeyConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
      webhookBase: (process.env["PUBLIC_APP_URL"] || "https://keta-sales.lovable.app").replace(/\/$/, ""),
    };
  });

export const connectTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(20).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const { connectBot } = await import("./telegram-connect.server");
    const businessId = await requireBusinessId(context.supabase);
    return connectBot(businessId, data.token);
  });

export const testTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const { testBot } = await import("./telegram-connect.server");
    return testBot(await requireBusinessId(context.supabase));
  });

export const sendOperatorTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const { sendTestMessageToOperators } = await import("./telegram-connect.server");
    return sendTestMessageToOperators(await requireBusinessId(context.supabase));
  });

export const disconnectTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireBusinessId } = await import("./tenant.server");
    const { disconnectBot } = await import("./telegram-connect.server");
    return disconnectBot(await requireBusinessId(context.supabase));
  });
