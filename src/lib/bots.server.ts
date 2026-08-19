import { decryptBotToken } from "./telegram.server";

export type ActiveBot = {
  id: string;
  business_id: string;
  token: string;
  bot_username: string | null;
};

/** Loads the active bot for a business and decrypts its token. Server-only. */
export async function getActiveBot(businessId: string): Promise<ActiveBot | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("telegram_bots")
    .select("id, business_id, bot_token_encrypted, bot_username")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    business_id: data.business_id,
    token: decryptBotToken(data.bot_token_encrypted),
    bot_username: data.bot_username,
  };
}

/** Loads a bot by its row id (used by the webhook route). */
export async function getBotById(botId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("telegram_bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle();
  return data;
}
