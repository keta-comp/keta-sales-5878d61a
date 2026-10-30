// Telegram botni bir marta ishga tushiradi: webhook + /buyruqlar ro'yxati.
// Ishlatish: node scripts/telegram-setup.mjs [--check] [--url=https://sayt.uz]
//   --check : hech narsa o'zgartirmaydi, faqat joriy webhook holatini ko'rsatadi
//   --url=  : PUBLIC_APP_URL o'rniga ochiq manzilni qo'ldan beradi
//
// WEBHOOK_SECRET_TOKEN src/lib/single-bot.server.ts dagi bilan AYNAN bir xil
// hisoblanadi (token'dan HMAC): ikkala taraf ham mos kelmasa webhook 401 qaytadi.
import { createHmac } from "node:crypto";
import fs from "node:fs";

const API = "https://api.telegram.org";
const WEBHOOK_PATH = "/api/public/telegram/webhook";

function envFromLocal() {
  const vars = {};
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"([^"]*)"/);
      if (match && !vars[match[1]]) vars[match[1]] = match[2];
    }
  }
  return vars;
}

const local = envFromLocal();
const env = (key) => process.env[key] || local[key] || "";

const token = env("TELEGRAM_BOT_TOKEN").trim();
if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  throw new Error("TELEGRAM_BOT_TOKEN topilmadi yoki noto'g'ri formatda (.env.local ga yozing)");
}

const urlArg = process.argv.find((arg) => arg.startsWith("--url="));
const baseUrl = (urlArg ? urlArg.slice("--url=".length) : env("PUBLIC_APP_URL")).replace(/\/$/, "");
if (!baseUrl) throw new Error("PUBLIC_APP_URL bo'sh — webhook manzili uchun --url=... bering");
if (!/^https:\/\//.test(baseUrl))
  throw new Error("PUBLIC_APP_URL https:// bilan boshlanishi shart");

const secretToken = createHmac("sha256", token).update("telegram-webhook").digest("base64url");

async function call(method, body = {}) {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!json?.ok) throw new Error(`${method}: ${json?.description ?? `HTTP ${response.status}`}`);
  return json.result;
}

const info = await call("getWebhookInfo");
console.log(
  `Webhook hozir: ${info.url || "(o'rnatilmagan)"}, navbatda: ${info.pending_update_count}`,
);

if (process.argv.includes("--check")) {
  const me = await call("getMe");
  console.log(`Bot: @${me.username} (${me.first_name})`);
  console.log(`Kutilgan manzil: ${baseUrl}${WEBHOOK_PATH}`);
  console.log(
    info.url === `${baseUrl}${WEBHOOK_PATH}`
      ? "OK — webhook to'g'ri"
      : "DIQQAT — manzil mos kelmaydi",
  );
  process.exit(0);
}

const setResult = await call("setWebhook", {
  url: `${baseUrl}${WEBHOOK_PATH}`,
  secret_token: secretToken,
  allowed_updates: ["message", "edited_message", "callback_query"],
  drop_pending_updates: true,
  max_connections: 100,
});
console.log(`setWebhook: ${setResult ? "OK" : "javob tushunarsiz"}`);

// Bot menyupidagi /buyruqlar — HELP_TEXT (src/lib/telegram-report.server.ts) bilan bir xil ro'yxat.
await call("setMyCommands", {
  commands: [
    { command: "today", description: "Bugungi hisobot" },
    { command: "yesterday", description: "Kechagi hisobot" },
    { command: "week", description: "Haftalik hisobot" },
    { command: "month", description: "Oylik hisobot" },
    { command: "qabullar", description: "Bugungi qabullar" },
    { command: "yangi", description: "Yangi qabul qo'shish" },
    { command: "excel", description: "Excel hisobot" },
    { command: "settings", description: "Bildirishnoma sozlamalari" },
    { command: "cancel", description: "Joriy amalni bekor qilish" },
    { command: "help", description: "Yordam" },
  ],
});
console.log("setMyCommands: OK");

const me = await call("getMe");
const after = await call("getWebhookInfo");
console.log(`\n@${me.username} tayyor → ${after.url}`);
console.log(
  "Telegram endi shu manzilga so'rov yuboradi. Ishga tushirishdan keyin botga /start yozib sinab ko'ring.",
);
