-- KetaOne: Platforma hisoboti (super-admin paneli bilan bir xil ko'rsatkichlar).
-- FAQAT O'QIYDI — hech narsani o'zgartirmaydi.
-- Ishga tushirish: Neon Console > SQL Editor > yangi query > yopishtir > Run
-- (Sanalarni shu holicha menga yuboring — izohlab beraman.)
-- Sana chegaralari UTC; panel ham UTC hisoblaydi.

-- 1) Bizneslar
SELECT count(*) AS jami,
       count(*) FILTER (WHERE status = 'active')     AS faol,
       count(*) FILTER (WHERE status = 'trial')      AS sinov,
       count(*) FILTER (WHERE status = 'suspended')  AS toxtatilgan,
       count(*) FILTER (WHERE status = 'cancelled')  AS bekor_qilingan,
       count(*) FILTER (WHERE created_at >= date_trunc('day', now()))   AS bugun_yangi,
       count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS oyda_yangi
FROM public.businesses;

-- 2) Reja bo'yicha taqsimot va tugaydigan muddatlar
SELECT plan,
       status,
       count(*) AS biznes_soni,
       count(*) FILTER (WHERE trial_ends_at IS NOT NULL
                        AND trial_ends_at < now())              AS sinov_muddati_tugagan,
       count(*) FILTER (WHERE subscription_ends_at IS NOT NULL
                        AND subscription_ends_at < now())        AS obuna_muddati_tugagan
FROM public.businesses
GROUP BY plan, status
ORDER BY biznes_soni DESC;

-- 3) Foydalanuvchilar
SELECT count(*) AS jami,
       count(*) FILTER (WHERE status = 'active')    AS faol,
       count(*) FILTER (WHERE status = 'suspended') AS bloklangan,
       count(*) FILTER (WHERE last_active_at >= now() - interval '7 days') AS haftada_kirgan,
       count(*) FILTER (WHERE created_at >= date_trunc('month', now()))    AS oyda_qayd_ilgan
FROM public.profiles;

-- 4) AI sarfi (token/so'rovlar)
SELECT count(*) AS jami,
       count(*) FILTER (WHERE created_at >= date_trunc('day', now()))   AS bugun,
       count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS oyda
FROM public.ai_usage_events;

-- 5) Umumiy yozuv hajmi (platforma bo'yicha)
SELECT (SELECT count(*) FROM public.customers)      AS mijozlar,
       (SELECT count(*) FROM public.leads)          AS lidlar,
       (SELECT count(*) FROM public.orders)         AS buyurtmalar,
       (SELECT count(*) FROM public.tasks)          AS vazifalar,
       (SELECT count(*) FROM public.products)       AS mahsulotlar,
       (SELECT count(*) FROM public.conversations)  AS suhbatlar,
       (SELECT count(*) FROM public.messages)       AS xabarlar,
       (SELECT count(*) FROM public.appointments)   AS qabullar,
       (SELECT count(*) FROM public.payments)       AS tolov_yozuvlari;

-- 6) Aylanma (to'langan to'lovlar yig'indisi)
SELECT COALESCE(sum(amount), 0) AS jami_aylanma,
       COALESCE(sum(amount) FILTER (WHERE COALESCE(paid_at, created_at)
              >= date_trunc('month', now())), 0) AS shu_oy
FROM public.payments
WHERE status = 'paid';

-- 7) Eng faol 20 biznes (so'nggi 30 kun)
SELECT b.name                                   AS biznes,
       b.plan                                   AS reja,
       b.status                                 AS holat,
       p.email                                  AS egasi,
       (SELECT count(*) FROM public.business_members bm WHERE bm.business_id = b.id) AS xodimlar,
       (SELECT count(*) FROM public.appointments a
          WHERE a.business_id = b.id AND a.starts_at >= now() - interval '30 days')  AS qabul_30kun,
       (SELECT COALESCE(sum(pm.amount), 0) FROM public.payments pm
          WHERE pm.business_id = b.id AND pm.status = 'paid'
            AND COALESCE(pm.paid_at, pm.created_at) >= now() - interval '30 days')   AS tushum_30kun
FROM public.businesses b
LEFT JOIN public.profiles p ON p.id = b.owner_id
ORDER BY tushum_30kun DESC, qabul_30kun DESC
LIMIT 20;

-- 8) Oxirgi 24 soatdagi xatolar (eng ko'p takrorlangan 10 tasi)
--    Bu jadval migratsiyadan keyin paydo bo'ladi; bazada bo'lmasa shu
--    qism xato beradi — undan oldingi 7 so'rov javobi baribir yuqorida qoladi.
SELECT count(*)                                    AS takror,
       route,
       status_code,
       left(message, 160)                          AS xabar
FROM public.error_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY route, status_code, left(message, 160)
ORDER BY takror DESC
LIMIT 10;
