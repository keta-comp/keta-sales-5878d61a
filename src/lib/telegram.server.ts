const TELEGRAM_API = "https://api.telegram.org";

/** Public base URL Telegram must call. Stable production host, overridable per environment. */
export function webhookBaseUrl(): string {
  return (process.env["PUBLIC_APP_URL"] || "https://keta-sales.lovable.app").replace(/\/$/, "");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export class TelegramError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Calls the Telegram Bot API with a specific business bot token. */
export async function telegramCall<T = unknown>(
  token: string,
  method: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`[telegram] ${method} network failure`, error);
    throw new TelegramError("Telegram could not be reached. Please try again.", 0);
  }

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: T;
    description?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new TelegramError(payload.description ?? `Telegram ${method} failed`, response.status);
  }
  return payload.result as T;
}

export type TelegramBotInfo = {
  id: number;
  username: string;
  first_name: string;
};

export type TelegramWebhookInfo = {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
  last_error_date?: number;
};

export async function getMe(token: string) {
  return telegramCall<TelegramBotInfo>(token, "getMe");
}

export async function getWebhookInfo(token: string) {
  return telegramCall<TelegramWebhookInfo>(token, "getWebhookInfo");
}

export async function sendTelegramMessage(token: string, chatId: string | number, text: string) {
  return telegramCall<{ message_id: number }>(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

/** Xabarni chatdan o'chiradi. Muvaffaqiyatsizlikni jim o'tkazamiz: xabar allaqachon
 *  yo'q bo'lishi yoki botning o'chirish huquqi bo'lmasligi mumkin. */
export async function deleteMessage(token: string, chatId: string | number, messageId: string | number) {
  try {
    await telegramCall(token, "deleteMessage", { chat_id: chatId, message_id: Number(messageId) });
  } catch (error) {
    console.error("[telegram] deleteMessage failed", error);
  }
}

export async function editMessageText(
  token: string,
  chatId: string | number,
  messageId: string | number,
  text: string,
) {
  return telegramCall(token, "editMessageText", {
    chat_id: chatId,
    message_id: Number(messageId),
    text,
    parse_mode: "HTML",
  });
}

/** Xabar ostidagi tugmalarni o'chiradi (amallar bajarilgandan keyin qayta bosilmasligi uchun). */
export async function removeInlineButtons(token: string, chatId: string | number, messageId: string | number) {
  try {
    await telegramCall(token, "editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: Number(messageId),
      reply_markup: { inline_keyboard: [] },
    });
  } catch (error) {
    console.error("[telegram] editMessageReplyMarkup failed", error);
  }
}

/** parse_mode=HTML xabarlarga foydalanuvchi matnini joylashtirishda bu majburiy. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
