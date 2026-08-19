import { createHash } from "node:crypto";

const TELEGRAM_API = "https://api.telegram.org";

export function getTelegramToken(): string {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

export async function telegramCall<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = getTelegramToken();
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(`Telegram ${method} failed [${response.status}]: ${payload.description ?? "unknown"}`);
  }
  return payload.result as T;
}

export async function sendTelegramMessage(chatId: string | number, text: string) {
  return telegramCall<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export function telegramWebhookSecret(token: string): string {
  // Deterministic secret derived from the bot token; used to verify Telegram calls.
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}