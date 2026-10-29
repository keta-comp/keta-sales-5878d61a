# KetaOne — Vercel'ga joylash

Loyiha Vercel uchun sozlangan: `vercel.json` mavjud va qurish jarayoni
Vercel'da avtomatik ravishda `vercel` preseti bilan ishlaydi
(Cloudflare varianti ham buzilmadi — o'sha holida qoladi).

---

## 1. Loyihani Vercel'ga ulash

1. Kodni GitHub repozitoriyaga yuklang.
2. https://vercel.com/new → repozitoriyani tanlang.
3. Framework Preset: **Other** (`vercel.json` qolganini o'zi hal qiladi).
4. Build Command: `npm run build` · Output Directory: `.vercel/output`
   (bular `vercel.json` da yozilgan, o'zgartirish shart emas).

## 2. Environment Variables (Project Settings → Environment Variables)

Production va Preview uchun quyidagilarni qo'shing:

| Nom | Qiymat |
| --- | --- |
| `NEON_DATABASE_URL` | `postgresql://neondb_owner:...@ep-...-pooler...aws.neon.tech/neondb?sslmode=require` (maxfiy) |
| `NEON_AUTH_ISSUER` | `https://ep-....neonauth...aws.neon.tech/neondb/auth` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | fayl saqlash — qo'shilmagan holda logo/biriktirma yuklash "sozlanmagan" xatosi beradi |
| `S3_PUBLIC_BASE_URL` | ixtiyoriy (bo'lmasa presigned GET) |
| `OPENROUTER_API_KEY` | `sk-or-...` (AI uchun) |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash` (ixtiyoriy) |
| `GEMINI_API_KEY` | ixtiyoriy zaxira |
| `TELEGRAM_BOT_TOKEN` | BotFather tokeni |
| `PUBLIC_APP_URL` | saytning haqiqiy manzili, masalan `https://ketaone.uz` |
| `LOVABLE_CRON_SECRET` | kunlik hisobot cron chaqiruvi uchun maxfiy so'z |
| `BOT_TOKEN_ENCRYPTION_KEY` | ixtiyoriy, 64 belgi |
| `INSTAGRAM_PAGE_ACCESS_TOKEN`, `META_APP_SECRET` | Instagram uchun, ixtiyoriy |

Autentifikatsiya va baza to'liq server tomonda — `VITE_` bilan boshlanadigan
Supabase kalitlari kerak emas. Muhit o'zgaruvchilarini qo'shgandan keyin
qayta **Redeploy** qiling.

Ro'yxatdan o'tishda Neon Auth email yuborishi uchun Neon dashboard →
Authentication → Email'da SMTP sozlanadi (yoki default yetkazib beruvchi).
Parolni tiklash havolasi `{PUBLIC_APP_URL}/auth?mode=recover` manziliga
qaytadi — `PUBLIC_APP_URL` to'g'ri bo'lishi shart.

## 3. Domen

Project Settings → **Domains** → `ketaone.uz` (va `www`) qo'shib,
registrarda Vercel ko'rsatgan DNS yozuvlarini kiritasiz.

## 4. Telegram webhook'ni yangi manzilga ko'chirish

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://ketaone.uz/api/public/telegram/webhook"
```

## 5. Kunlik hisobot jadvali (ixtiyoriy)

Vercel Cron (`vercel.json` ga qo'shish mumkin) yoki tashqi scheduler orqali
har 15 daqiqada `POST /api/public/cron/daily-report` chaqiriladi va
`x-cron-secret` sarlavhasiga `LOVABLE_CRON_SECRET` qiymati qo'yiladi.

---

Eslatma: Lovable ichidagi ko'rish oynasi avvalgidek ishlaydi — bu sozlamalar
faqat Vercel'dagi qurishga ta'sir qiladi.
