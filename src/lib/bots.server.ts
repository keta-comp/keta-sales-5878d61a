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

type BotRow = {
  id: string;
  business_id: string;
  bot_token_encrypted: string;
  webhook_secret: string;
  is_active: boolean;
};

const BOT_TTL_MS = 30_000;
const botCache = new Map<string, { at: number; value: BotRow | null }>();

/** Loads a bot by its row id (used by the webhook route). Cached briefly to cut webhook latency. */
export async function getBotById(botId: string): Promise<BotRow | null> {
  const cached = botCache.get(botId);
  if (cached && Date.now() - cached.at < BOT_TTL_MS) return cached.value;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("telegram_bots")
    .select("id, business_id, bot_token_encrypted, webhook_secret, is_active")
    .eq("id", botId)
    .maybeSingle();
  const value = (data as BotRow | null) ?? null;
  botCache.set(botId, { at: Date.now(), value });
  return value;
}

/** Called when a bot is connected/disconnected so the webhook sees the change at once. */
export function invalidateBotCache(botId?: string) {
  if (botId) botCache.delete(botId);
  else botCache.clear();
}
