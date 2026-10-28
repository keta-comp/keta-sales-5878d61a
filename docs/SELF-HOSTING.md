# KetaOne — mustaqil serverda ishga tushirish

Baza allaqachon **sizning Supabase loyihangizga** (`htydowzamirhpknppglu`)
o'rnatildi: 33 jadval, xavfsizlik qoidalari (RLS), funksiyalar, triggerlar va
realtime sozlamalari tayyor. Quyida qolgan bosqichlar.

---

## 1. Supabase sozlamalari (brauzerdan, 2 daqiqa)

1. **Authentication → Sign In / Providers → Email**
   - "Allow new users to sign up" = **ON** (ko'p foydalanuvchili CRM)
   - "Confirm email" = **OFF** (ro'yxatdan o'tgach darhol kirsin)
2. **Project Settings → API keys** → `secret (service_role)` kalitini oling —
   u faqat serverda ishlatiladi, hech qachon frontendga qo'yilmaydi.

## 2. Muhit o'zgaruvchilari

`.env.example` faylidan `.env` yarating — Supabase manzili va ochiq kaliti
allaqachon to'ldirilgan. Qo'shishingiz kerak bo'lgani:

- `SUPABASE_SERVICE_ROLE_KEY` — 1-bosqichda olgan secret kalit
- `OPENROUTER_API_KEY` — https://openrouter.ai/keys (AI uchun, tavsiya etiladi)
- yoki `GEMINI_API_KEY` — https://aistudio.google.com/apikey (bepul)
- `TELEGRAM_BOT_TOKEN` — BotFather'dan
- `PUBLIC_APP_URL` — saytning haqiqiy manzili (masalan `https://ketaone.uz`)

## 3. Cloudflare Workers'ga joylash

```bash
npm i -g wrangler
wrangler login

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put OPENROUTER_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put LOVABLE_CRON_SECRET

npm install
npm run build
wrangler deploy
```

`wrangler.toml` ichidagi `[vars]` da Supabase manzili, ochiq kaliti va
`PUBLIC_APP_URL` turadi — domeningiz boshqacha bo'lsa shu yerda o'zgartiring.

## 4. Super Admin hisobini yaratish

1. Saytga kirib odatdagidek ro'yxatdan o'ting (masalan
   `nursultansayyora@gmail.com`).
2. Supabase → **SQL Editor** da bir marta bajaring:

```sql
insert into public.platform_admins (user_id, email)
select id, email from auth.users where email = 'nursultansayyora@gmail.com'
on conflict do nothing;
```

Shundan keyin `/super-admin` bo'limi shu hisobga ochiladi.

## 5. Telegram webhook

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://SIZNING-DOMEN/api/public/telegram/webhook
```

`PUBLIC_APP_URL` to'g'ri bo'lsa tizim buni o'zi ham sozlaydi.

## 6. Kunlik hisobot jadvali (ixtiyoriy)

Supabase → SQL Editor:

```sql
select cron.schedule('ketaone-daily-report', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://SIZNING-DOMEN/api/public/telegram/daily-report',
    headers := '{"x-cron-secret":"SIZNING_CRON_SECRET"}'::jsonb
  );
$$);
```

---

## Tekshirish ro'yxati

- [ ] Sayt o'z domeningizda ochiladi, ro'yxatdan o'tish va kirish ishlaydi
- [ ] Yangi hisob uchun onboarding (soha tanlash) ishlaydi
- [ ] `/super-admin` faqat platform_admins ro'yxatidagi hisobga ochiladi
- [ ] Telegram bot /start ga javob beradi va hisobot yuboradi

## Lovable'ga bog'liqlik qoldimi?

Yo'q. `OPENROUTER_API_KEY` (yoki `GEMINI_API_KEY`) berilgach AI mustaqil ishlaydi;
baza, login, fayllar — hammasi sizning Supabase va Cloudflare hisobingizda.

## 7. Backup / restore va monitoring (pilot)

**Migratsiyalar.** Barcha sxema o'zgarishlari `supabase/migrations/` da. Yangi
muhitga qo'yish:

```bash
npx supabase login           # brauzer orqali tasdiqlanadi
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --linked
```

**Zaxira.** Har kuni migratsiyalangan holatni saqlab boring:

```bash
npx supabase db dump --linked --db-url "$DATABASE_URL" -f backups/schema-$(date +%F).sql
```

Supabase Pro rejada avtomatik kunlik backup + PITR bor; bepul rejada yuqoridagi
dump fayllarini alohida joyga (git emas!) ko'chirib turing.

**Qaytarish.** Buzilgan bazani tiklash — Supabase dashboard → Database → Backups
(Pro/PITR) yoki bo'sh bazaga `psql "$DATABASE_URL" -f backups/schema-YYYY-MM-DD.sql`
va so'ng backup CSVlarini import qilish.

**Monitoring.**
- `GET /api/health` — 200 = hammasi joyida, 503 = muhit o'zgaruvchisi yoki baza bilan muammo (Railway/Vercel ping sozlamasi shu URL'ga qo'yilsin). Javobdagi `errors_last_24h` sohasi — oxirgi 24 soatda yig'ilgan xatolar soni (readiness bog'lanmagan, tablagacha `null`).
- Server (SSR) tomonidagi qayta tiklangan og'ir xatolar avtomatik `error_events` jadvaliga yoziladi: bitta xato (fingerprint = holat kodi + yo'l + birinchi qator) 10 daqiqada ko'pi bilan bir marta. `/super-admin/errors` sahifasi shu jurnalni ko'rsatadi va eskilarini tozalaydi.
- Migratsiya hali tushirilmagan bo'lsa yoki ruxsat yetishmasa, yig'uvchi o'zini o'chiq holatga o'tkazadi (loglar shovqinlanmaydi). Majburan o'chirish: `ERROR_EVENTS_DISABLED=true`.
- Xatolar server konsolida `[telegram-webhook]`, `[instagram-webhook]` kabi belgilar bilan ham chiqadi — Railway/Cloudflare loglarida qidiring.
- Kunlik hisobot cron'iga `LOVABLE_CRON_SECRET` bilan `POST /api/public/telegram/daily-report` sozlangan (6-bo'lim).

`error_events` jadvali faqat `service_role` uchun (RLS yoqilgan, anon/authenticated'dan
`REVOKE`). Shu sababli uni Super Admin o'zi ham SQL orqali o'qimaydi — panel server
funksiyasi orqali o'tadi.

## 8. Pilot uchun tekshirish ro'yxati

- [ ] `supabase db push` — barcha migratsiyalar production bazada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` server muhitida (omma bron sahifasi shu bilan ishlaydi)
- [ ] To'lov webhook kalitlari (`PAYME_KEY`, `CLICK_SECRET_KEY`, `CLICK_SERVICE_ID`) o'rnatilgan — ulanmagan holda endpointlar fail-closed
- [ ] `/api/health` 200 qaytaryapti
- [ ] Bitta real biznes to'liq oqim: sozlamalar → xizmatlar → xodimlar → bron → kalendar → oylik hisob-kitob → CSV eksport
- [ ] Omma bron havolasi (`/b/<slug>`) telefonda ochiladi va bron `new` holatida tushadi
- [ ] Billing yoqilganda (`VITE_BILLING_ENFORCED=true` build) tarif darvozalari ishlaydi; pilot davomida bayrog' o'chiq
- [ ] Mijoz profilida marketing roziligi yoqiladi/bekor qilinadi va "Ma'lumotlarni yuklash" JSON fayl beradi
- [ ] `/super-admin/errors` sahifasi ochiladi (migratsiyadan keyin xato bo'lmasa "Xatolar yo'q" ko'rinadi)

## 9. Mijoz ma'lumotlari: rozilik, eksport, o'chirish

Rozilik (`customers.marketing_consent` + `consent_updated_at`) — `sales.manage`
huquqi bo'lgan a'zo yozadi; o'chirish faqat ego/admin. Server tekshiradi, frontend
yashirish bilan cheklanmaydi.

O'chirish — **anonymizatsiya**: ism "O'chirilgan mijoz"ga almashadi, telefon/email/
manzil/izohlar va ijtimoiy tarmoq bog'lanishlari tozalanadi, suhbatlar + ularning
xabarlari va faoliyat yozuvlari o'chiriladi, keyin `erased_at`/`erased_by` qo'yiladi.
Moliyaviy yozuvlar (to'lovlar, buyurtmalar) va uchrashuvlar qonun talabi bilan
**saqlanadi** — bu to'liq fizik o'chirish emas.

`customers_privacy_enforce` trigger'i bazada qo'shimcha qatlam: `erased_at` o'zgarsa
faqat biznes admin'i (JWT orqali) ruxsat etadi va o'chirilgan mijozning aloqa
maydonlarini qayta to'ldirishga (`erased_at` tiklanmaydi) yo'l qo'ymaydi.
`service_role` yozuvlari `auth.uid()` bo'sh bo'lgani uchun trigger'dan o'tadi.

## 10. Kutayotgan migratsiyalar (hali production'da emas)

`supabase/migrations/` 2026-10-27 va 2026-10-28 qo'shilganlari `db push` qilinmagan:

| Fayl | Nima qiladi |
| --- | --- |
| `20261027129000_…` | `payroll_statements.expense_id`/`paid_method` + `expenses`/`cash_sessions` uchun `business_id` defaulti |
| `20261027130000_…` | `customers` rozilik/`erased_at`/`erased_by` ustunlari + `customers_privacy_enforce` trigger |
| `20261027131000_…` | `error_events` jadvali (RLS, faqat `service_role`) |
| `20261027132000_…` | `business_settings.phone`/`logo_path` + ochiq `branding` storage bucket va a'zolar uchun yozish politsikasi |
| `20261028133000_…` | Sotuv agenti "operator" tushumini bekor qiladi: `lead_status.needs_operator` → `needs_attention`, `message_role.operator` → `staff`, `assigned_operator_id` → `assigned_member_id` (leads/orders/customers/conversations/tasks), `messages.operator_id` → `member_id`, `operator_assignments` → `lead_assignments`, `businesses.operator_group_chat_id` → `staff_group_chat_id`, `user_roles`/`business_members` `operator` → `receptionist`, `handle_new_user()` dan `operators` inserti olib tashlanadi va `operators` jadvali `DROP` qilinadi |
| `20261028134000_…` | Brief §7.3 — ruxsatlar bazoda: `crm_configs` ni barcha a'zolar o'qiydi, yozadi faqat owner/admin (`is_business_admin`) |
| `20261028135000_…` | Xususiy `crm_attachments` bucket'i (15 MB, PDF/PNG/JPG/WEBP/TIFF) + ob'ekt yo'lining birinchi qismi biznes IDsi bo'lgan a'zo politsikalari (tibbiy hujjatlar, rentgen, tahlil natijalari) |
| `20261028136000_…` | `audit_logs` ga o'qish politsikasi: biznes admini faqat o'z biznesining `medical.*` yozuvlarini ko'radi (tibbiy yozuvlar jurnali) |
| `20261028140000_…` | `notification_reads` jadvali — platforma e'lonlarining o'qilganlik talqinlari (RLS: har foydalanuvchi faqat o'z talqini; `service_role` to'liq). E'lon `DROP` qilinganda talqinlar ham `ON DELETE CASCADE` bilan ketadi |
| `20261028141000_…` | `businesses.plan` uchida bitta so'z bo'lmaguncha tozalash: `starter→start`, `business→pro`, `enterprise→max` + `businesses_plan_check` (`free,start,pro,max`). `my_access_state()` qayta yoziladi: endi u `plan`, `trial_ends_at`, `subscription_ends_at`, `business_id` va `features` (`feature_flags` shu workspace'ga mos kelganda) ham qaytaradi |

Migratsiya `20261028133000_…` bilan **kesin ravishda birga** tushishi kerak: yangi
kod eski `operators` jadvali/ustun nomlariga murojaat qilmaydi, eski kod esa
migratsiyadan keyin ishlamaydi. `app_role` enumidagi `operator` yorlig'i tushirib
bo'lmagani uchun (Postgres enum qiymatini o'chirmaydi) inert holicha qoladi —
bitta qator ham uni saqlamaydi va hech qaysi kod yo'li uni bermaydi.

Bular shu kod bilan **birga** tushirilishi kerak: `db push` — deploy'dan oldin.
Migratsiyasiz muhitda mijozlar ro'yxati (rozilik ustunlari), oylikni "to'langan"ga
o'tkazish (`expense_id`) va xato jurnali ishlamaydi; ulardan faqat xato yig'uvchi
o'zini o'chiq holatga o'tkazadi, qolganlari xato beradi. `20261028135000` bo'lmasa
CRMga fayl biriktirish va ochish xato beradi (bucket yo'q); `20261028136000` bo'lmasa
yozuvlar baribir `audit_logs`ga tushadi, lekin Sozlamalardagi "Tibbiy yozuvlar jurnali"
bo'sh chiqadi — RLS o'qishga ruxsat bermaydi.

`20261028140000` tushirilmagan muhitda hech narsa buzilmaydi: qo'ng'iroq va Control
Center e'lonlarni ko'rsatadi, faqat "N o'qildi" sonisi yo'q — hamma e'lon
o'qilmaganni hisoblanadi (jadval so'rovi xatosi yashirilmaydi, e'tibor bilan
bardosh qilinadi). `20261028141000` tushirilmagan bo'lsa texnik ishlar rejimi,
hisob va workspace bloklash eshiklari ishlaydi (eski `my_access_state()` ham
`user_status`, `workspace_status`, `maintenance_*` qaytaradi), lekin `feature_flags`
va plan/sinov muddati billing tomonidan ko'rinmaydi. Pilot rejimida
(`VITE_BILLING_ENFORCED` o'rnatilmagan) bu sezilmaydi; tarifni majburiy qilish
rejalashtirilganda migratsiya **avval** tushirilishi shart — aks holda `my_access_state()`
plan maydonini qaytarmagani uchun barcha workspace'lar muddati tugagan deb hisoblanadi.

## 11. Onlayn qabul sahifasi (Instagram bio uchun)

Har biznesning o'z havolasi bor: `/b/<booking_slug>` (sozlamalar → "Onlayn qabul
havolasi" kartasida nusxalanadi, slug birinchi ochilganda avtomatik yaratiladi).
Sahifa mijozdan ro'yxatdan o'tish so'ramaydi: xizmat → xodim → sana → bo'sh vaqtni
tanlaydi, ism/telefon/izoh qoldiradi va bron `new` holatida tushadi.

Sahifa tashqi ko'rinishi biznes brendi bilan to'ldiriladi — Sozlamalar → "Brend va
aloqa": logotip (`branding` bucket'iga `<businessId>/logo.<ext>`, 2 MB gacha,
PNG/JPG/WEBP) va telefon (`tel:` havola sifatida chiqadi). Logotip yo'q bo'lsa
standart belgi ko'rinadi. Bucket nomi va ob'ekt yo'li o'zgaruvchiga bog'liq emas:
URL server tomonida `SUPABASE_URL`dan yig'iladi, shuning uchun yangi loyihaga
ko'chirganda faqat fayllarni qayta yuklash kifoya.

Barcha sohalar uchun bir xil ishlaydi — `booking_enabled` yoqilgan istalgan biznes
ochiq havolaga ega (soha tanlovi faqat ichki CRM modulini sozlaydi).
