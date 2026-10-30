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
node scripts/telegram-setup.mjs          # setWebhook + /buyruqlar ro'yxati
node scripts/telegram-setup.mjs --check  # faqat tekshirish
```

Skript `TELEGRAM_BOT_TOKEN` va `PUBLIC_APP_URL` ni `.env.local` (yoki muhit
o'zgaruvchilaridan) oladi, webhook maxfiy so'zni esa kod bilan bir xil usulda
hisoblaydi. Qo'lda qilsangiz: Telegram `secret_token` sarlavhasisiz so'rov yuborsa
webhook 401 qaytadi — shuning uchun skriptdan foydalangan ma'qul.

## 5. Kunlik hisobot va eslatmalar jadvali

`vercel.json` da `crons` bloki allaqachon bor — u har 15 daqiqada bu ikki
manzilni **GET** qiladi:

- `/api/public/telegram/daily-report`
- `/api/public/reminders`

Vercel so'rovni `Authorization: Bearer <CRON_SECRET>` bilan imzolaydi, shuning
uchun **`CRON_SECRET` ni `LOVABLE_CRON_SECRET` bilan bir xil qo'ying** (yoki
`LOVABLE_CRON_SECRET` bo'lmasa, `CRON_SECRET` o'zi ishlatiladi). Vercel Hobby
tarifida bittadan ko'p cron bo'lmaydi: shunda `vercel.json` dagi `crons` blokini
butunlay o'chirib, ikkala ishni ham `.github/workflows/scheduler.yml` orqali
yuriting (u ham har 15 daqiqada ishlaydi).

---

Eslatma: Lovable ichidagi ko'rish oynasi avvalgidek ishlaydi — bu sozlamalar
faqat Vercel'dagi qurishga ta'sir qiladi.
