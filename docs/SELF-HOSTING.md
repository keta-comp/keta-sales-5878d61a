# Loyihani Lovable'dan mustaqil ishga tushirish

Bu qo'llanma loyihani to'liq o'z infratuzilmangizga ko'chiradi:
**o'z Supabase bazangiz + o'z Gemini AI kalitingiz + Cloudflare Workers hosting.**

---

## 1. O'z Supabase loyihangizni yarating

1. [supabase.com](https://supabase.com) → **New project** (bepul reja kifoya).
2. Loyiha yaratilgach, **Project Settings → API** dan quyidagilarni oling:
   - `Project URL` → `SUPABASE_URL` va `VITE_SUPABASE_URL`
   - `publishable` kalit → `SUPABASE_PUBLISHABLE_KEY` va `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `secret` (service_role) kalit → `SUPABASE_SERVICE_ROLE_KEY` (faqat serverda!)

## 2. Baza tuzilmasini o'rnating

Kompyuteringizda:

```bash
npm i -g supabase
supabase login
supabase link --project-ref SIZING_PROJECT_REF
supabase db push
```

`supabase/migrations/` dagi 5 ta migratsiya barcha jadvallar, xavfsizlik
qoidalari (RLS) va funksiyalarni yaratadi.

**Ro'yxatdan o'tishni yoping** (bitta admin hisob saqlanadi):
**Authentication → Sign In / Providers → "Allow new users to sign up" = OFF**

## 3. Ma'lumotlarni ko'chiring

Lovable'da: **Cloud → Advanced settings → Export data** — eksport tayyor
bo'lgach yuklab oling va yangi bazaga tiklang (Supabase SQL Editor orqali
`INSERT` qiling yoki `psql` bilan restauratsiya qiling).

Keyin admin hisobingizni yarating: **Authentication → Users → Add user**
(hozirgi email/parol bilan, "Auto Confirm User" ni yoqing).

## 4. Gemini AI kalitini oling

[aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key** (bepul kvota bor).
Kod avtomatik ravishda `GEMINI_API_KEY` bo'lsa Google bilan to'g'ridan-to'g'ri
ishlaydi — Lovable'siz.

## 5. Cloudflare Workers'ga joylang

```bash
npm i -g wrangler
wrangler login

# Sirli qiymatlar:
wrangler secret put GEMINI_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put BOT_TOKEN_ENCRYPTION_KEY

# wrangler.toml dagi PUBLIC_APP_URL va [vars] ni o'z domeningizga o'zgartiring,
# .env.example asosida .env yarating, so'ng:
npm install
npm run build
wrangler deploy
```

## 6. Telegram webhook'ni yangilang

Sayt ochilgach, bir marta so'rov yuboring (yoki terminaldan):

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://SIZING-DOMEN/api/public/telegram/webhook
```

Yoki saytning server logikasidan foydalaning — `PUBLIC_APP_URL` to'g'ri
bo'lsa, `ensureSingleBotWebhook()` buni avtomatik qiladi.

---

## Tekshirish ro'yxati

- [ ] Sayt o'z domeningizda ochiladi va admin login ishlaydi
- [ ] Dashboard'da ko'chirilgan mijozlar/buyurtmalar ko'rinadi
- [ ] Telegram bot xabarga 1–3 soniyada javob beradi
- [ ] Operator javoblari dashboard'dan Telegram'ga boradi

## Qayta Lovable'ga bog'liq bo'lgan narsa qoldimi?

Yo'q. `GEMINI_API_KEY` berilgach AI Lovable'siz ishlaydi; baza, login,
fayllar — hammasi sizning Supabase/Cloudflare hisobingizda.
