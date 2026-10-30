-- Bot ichidagi suhbat holati. Serverless muhitda jarayon xotirasi so'rovlar orasida
-- saqlanmaydi, shuning uchun kirish oqimi (email → parol → biznes tanlash) va qabul
-- yaratish formasining bosqichi shu jadvalda turadi.
--
-- Jadvalda parol SAQLANMAYDI: faqat kutilayotgan bosqich, tasdiqlangan email va
-- parol yozilgan xabar identifikatori (tekshiruvdan so'ng o'chirish uchun) turadi.
-- RLS yoqilgan, ammo hech qanday policy yo'q — app_user/app_anon bu jadvalni
-- umiman ko'ra olmaydi, faqat platform webhook'i app_service bilan ishlaydi.

CREATE TABLE IF NOT EXISTS public.telegram_bot_state (
  telegram_user_id TEXT NOT NULL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  secret_message_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS telegram_bot_state_expiry_idx
  ON public.telegram_bot_state (expires_at);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.telegram_bot_state TO app_service;

-- Yangi qabul bildirishnomalari bot orqali kelishi uchun: avval default false bo'lgan
-- bayroq endi yangi ulanishlarda yoniq, va allaqachon ulangan bizneslar ham
-- qabul xabarlarini oladi (sozlamalardan o'chirib qo'yish mumkin).
ALTER TABLE public.telegram_links ALTER COLUMN notify_booking SET DEFAULT true;

UPDATE public.telegram_links
   SET notify_booking = true
 WHERE status = 'active'
   AND notify_booking = false;
