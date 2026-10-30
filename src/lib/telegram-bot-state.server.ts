/**
 * Bot suhbati bosqichlari. Serverless muhitda jarayon xotirasi so'rovlar orasida
 * saqlanmaydi, shuning uchun kirish oqimi (email → parol → biznes) va qabul yaratish
 * formasining bosqichi Neon'dagi telegram_bot_state jadvalida turadi.
 *
 * Parol bu jadvalda SAQLANMAYDI: faqat kutilayotgan bosqich, tasdiqlangan email va
 * tekshiruvdan so'ng o'chiriladigan xabar identifikatori qoladi.
 */
import { supabaseAdmin } from "./platform.server";

const TABLE = "telegram_bot_state";

export const BOT_STATE_TTL_MS = 15 * 60_000;
export const MAX_LOGIN_ATTEMPTS = 5;

export type BotStep =
  | "idle"
  | "awaiting_email"
  | "awaiting_password"
  | "awaiting_business"
  | "booking_name"
  | "booking_phone"
  | "booking_when";

export type BotBusiness = { id: string; name: string };

export type BotBookingDraft = {
  name?: string;
  phone?: string;
  serviceId?: string;
  serviceName?: string;
  durationMinutes?: number;
};

export type BotStateData = {
  email?: string;
  userId?: string;
  businesses?: BotBusiness[];
  booking?: BotBookingDraft;
};

export type BotStateRow = {
  telegram_user_id: string;
  chat_id: string;
  state: BotStep;
  data: BotStateData;
  attempts: number;
  secret_message_id: string | null;
  expires_at: string;
};

function normalize(row: unknown): BotStateRow | null {
  const value = row as Record<string, unknown> | null;
  if (!value || typeof value["telegram_user_id"] !== "string") return null;
  const data = value["data"];
  return {
    telegram_user_id: value["telegram_user_id"],
    chat_id: String(value["chat_id"] ?? ""),
    state: (typeof value["state"] === "string" ? value["state"] : "idle") as BotStep,
    data: (data && typeof data === "object" ? data : {}) as BotStateData,
    attempts: Number(value["attempts"] ?? 0),
    secret_message_id: value["secret_message_id"] == null ? null : String(value["secret_message_id"]),
    expires_at: String(value["expires_at"] ?? ""),
  };
}

/** Eskirgan holat o'chiriladi va null qaytadi: suhbat boshidan davom etmaydi. */
export async function getBotState(telegramUserId: string): Promise<BotStateRow | null> {
  const { data } = await supabaseAdmin
    .from(TABLE)
    .select("telegram_user_id, chat_id, state, data, attempts, secret_message_id, expires_at")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  const row = normalize(data);
  if (!row) return null;
  if (row.expires_at && Date.parse(row.expires_at) < Date.now()) {
    await clearBotState(telegramUserId);
    return null;
  }
  return row;
}

export async function setBotState(input: {
  telegramUserId: string;
  chatId: string;
  step: BotStep;
  data?: BotStateData;
  attempts?: number;
  secretMessageId?: string | null;
}): Promise<void> {
  const now = Date.now();
  const row = {
    telegram_user_id: input.telegramUserId,
    chat_id: input.chatId,
    state: input.step,
    data: (input.data ?? {}) as never,
    attempts: input.attempts ?? 0,
    secret_message_id: input.secretMessageId ?? null,
    updated_at: new Date(now).toISOString(),
    expires_at: new Date(now + BOT_STATE_TTL_MS).toISOString(),
  };
  const { error } = await supabaseAdmin.from(TABLE).upsert(row, { onConflict: "telegram_user_id" });
  if (error) throw new Error(error.message);
}

export async function clearBotState(telegramUserId: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("telegram_user_id", telegramUserId);
  if (error) console.error("[telegram-bot-state] clear failed", error.message);
}
