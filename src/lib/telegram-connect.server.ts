import { getActiveBot, invalidateBotCache } from "./bots.server";
import {
  botWebhookUrl,
  deleteWebhook,
  encryptBotToken,
  getMe,
  getWebhookInfo,
  newWebhookSecret,
  registerWebhook,
  TELEGRAM_TOKEN_PATTERN,
  TelegramError,
  sendTelegramMessage,
} from "./telegram.server";

export type SafeBot = {
  id: string;
  bot_username: string | null;
  bot_first_name: string | null;
  telegram_bot_id: number | null;
  webhook_url: string | null;
  webhook_status: string;
  is_active: boolean;
  last_error: string | null;
  last_checked_at: string | null;
  connected_at: string | null;
};

function telegramMessage(error: unknown): string {
  if (error instanceof TelegramError) {
    if (error.status === 401 || error.status === 404) {
      return "Telegram rejected this token. Copy the token from @BotFather and try again.";
    }
    if (error.status === 0) return "Telegram could not be reached. Please try again.";
    return `Telegram error: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function connectBot(businessId: string, rawToken: string): Promise<SafeBot> {
  const token = rawToken.trim();
  if (!TELEGRAM_TOKEN_PATTERN.test(token)) {
    throw new Error("Invalid Telegram bot token. Please copy the token from @BotFather and try again.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Validate the token against Telegram itself.
  let me;
  try {
    me = await getMe(token);
  } catch (error) {
    throw new Error(telegramMessage(error));
  }

  // 2. The same bot may not serve two businesses.
  const { data: clash } = await supabaseAdmin
    .from("telegram_bots")
    .select("id, business_id")
    .eq("telegram_bot_id", me.id)
    .eq("is_active", true)
    .maybeSingle();
  if (clash && clash.business_id !== businessId) {
    throw new Error("This Telegram bot is already connected to another business.");
  }

  // 3. Retire the previous bot of this business (history stays intact).
  const previous = await getActiveBot(businessId);
  if (previous && previous.id !== clash?.id) {
    try {
      await deleteWebhook(previous.token);
    } catch (error) {
      console.error("[telegram-connect] could not remove previous webhook", error);
    }
  }
  await supabaseAdmin
    .from("telegram_bots")
    .update({ is_active: false, webhook_status: "disconnected" })
    .eq("business_id", businessId)
    .eq("is_active", true);
  invalidateBotCache();

  // 4. Store the new bot with an encrypted token and a fresh webhook secret.
  const webhookSecret = newWebhookSecret();
  const { data: bot, error: insertError } = await supabaseAdmin
    .from("telegram_bots")
    .insert({
      business_id: businessId,
      bot_token_encrypted: encryptBotToken(token),
      webhook_secret: webhookSecret,
      bot_username: me.username,
      bot_first_name: me.first_name,
      telegram_bot_id: me.id,
      is_active: true,
      webhook_status: "pending",
      connected_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (insertError || !bot) {
    throw new Error(insertError?.message ?? "Could not save the Telegram bot.");
  }

  // 5. Register the webhook automatically.
  try {
    const url = await registerWebhook(token, bot.id, webhookSecret);
    const info = await getWebhookInfo(token);
    const active = info.url === url;
    const { data: updated } = await supabaseAdmin
      .from("telegram_bots")
      .update({
        webhook_url: url,
        webhook_status: active ? "active" : "failed",
        last_error: active ? null : (info.last_error_message ?? "Telegram did not confirm the webhook URL"),
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", bot.id)
      .select("*")
      .single();
    if (!active) {
      throw new Error("Bot connected, but webhook registration failed. Please retry.");
    }
    return toSafeBot(updated ?? bot);
  } catch (error) {
    await supabaseAdmin
      .from("telegram_bots")
      .update({
        webhook_url: botWebhookUrl(bot.id, webhookSecret),
        webhook_status: "failed",
        last_error: telegramMessage(error),
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", bot.id);
    throw new Error(
      error instanceof Error && error.message.startsWith("Bot connected")
        ? error.message
        : `Bot connected, but webhook registration failed: ${telegramMessage(error)}`,
    );
  }
}

export async function testBot(businessId: string) {
  const bot = await getActiveBot(businessId);
  if (!bot) return { connected: false as const, error: "No Telegram bot connected yet." };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const [me, info] = await Promise.all([getMe(bot.token), getWebhookInfo(bot.token)]);
    const { data: row } = await supabaseAdmin
      .from("telegram_bots")
      .select("webhook_url")
      .eq("id", bot.id)
      .single();
    const expected = row?.webhook_url ?? null;
    const active = Boolean(info.url) && (!expected || info.url === expected);
    await supabaseAdmin
      .from("telegram_bots")
      .update({
        bot_username: me.username,
        bot_first_name: me.first_name,
        webhook_status: active ? "active" : "failed",
        last_error: info.last_error_message ?? null,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", bot.id);

    return {
      connected: true as const,
      bot: { id: me.id, username: me.username, first_name: me.first_name },
      webhook: {
        url: info.url,
        active,
        pending_update_count: info.pending_update_count,
        last_error_message: info.last_error_message ?? null,
      },
    };
  } catch (error) {
    const message = telegramMessage(error);
    await supabaseAdmin
      .from("telegram_bots")
      .update({ webhook_status: "failed", last_error: message, last_checked_at: new Date().toISOString() })
      .eq("id", bot.id);
    return { connected: false as const, error: message };
  }
}

export async function sendTestMessageToOperators(businessId: string) {
  const bot = await getActiveBot(businessId);
  if (!bot) throw new Error("No Telegram bot connected yet.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("business_settings")
    .select("operator_group_chat_id, business_name")
    .eq("business_id", businessId)
    .maybeSingle();
  const chatId = settings?.operator_group_chat_id;
  if (!chatId) {
    throw new Error("Set the operator group chat ID first, then send a test message.");
  }
  await sendTelegramMessage(
    bot.token,
    chatId,
    `✅ <b>${settings?.business_name ?? "Your store"}</b> — Telegram connection test from @${bot.bot_username ?? "your bot"}.`,
  );
  return { sent: true as const, chatId };
}

export async function disconnectBot(businessId: string) {
  const bot = await getActiveBot(businessId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!bot) return { ok: true as const, alreadyDisconnected: true };
  let webhookRemoved = true;
  try {
    await deleteWebhook(bot.token);
  } catch (error) {
    webhookRemoved = false;
    console.error("[telegram-disconnect]", error);
  }
  await supabaseAdmin
    .from("telegram_bots")
    .update({
      is_active: false,
      webhook_status: "disconnected",
      webhook_url: null,
      last_error: webhookRemoved ? null : "Webhook could not be removed at Telegram",
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", bot.id);
  return { ok: true as const, webhookRemoved };
}

export function toSafeBot(row: {
  id: string;
  bot_username: string | null;
  bot_first_name: string | null;
  telegram_bot_id: number | null;
  webhook_url: string | null;
  webhook_status: string;
  is_active: boolean;
  last_error: string | null;
  last_checked_at: string | null;
  connected_at: string | null;
}): SafeBot {
  return {
    id: row.id,
    bot_username: row.bot_username,
    bot_first_name: row.bot_first_name,
    telegram_bot_id: row.telegram_bot_id,
    webhook_url: row.webhook_url,
    webhook_status: row.webhook_status,
    is_active: row.is_active,
    last_error: row.last_error,
    last_checked_at: row.last_checked_at,
    connected_at: row.connected_at,
  };
}
