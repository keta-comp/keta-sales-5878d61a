-- KetaOne: qo'llanilmagan migratsiyalar oldidan OLIN (o'qish Only) tekshiruvi.
-- Neon Console > SQL Editor > yopishtir > Run. Hech narsani o'zgartirmaydi.
-- Natijani shu holicha menga yuboring — qaysi qatorlar kerakligini aytaman.

SELECT 'jadval: telegram_bot_state' AS obyekt,
       CASE WHEN to_regclass('public.telegram_bot_state') IS NULL THEN 'yo''q' ELSE 'bor' END AS holat
UNION ALL
SELECT 'jadval: attendance',
       CASE WHEN to_regclass('public.attendance') IS NULL THEN 'yo''q' ELSE 'bor' END
UNION ALL
SELECT 'jadval: study_groups',
       CASE WHEN to_regclass('public.study_groups') IS NULL THEN 'yo''q' ELSE 'bor' END
UNION ALL
SELECT 'jadval: group_members',
       CASE WHEN to_regclass('public.group_members') IS NULL THEN 'yo''q' ELSE 'bor' END
UNION ALL
SELECT 'ustun: services.deposit_type',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                         AND table_name = 'services' AND column_name = 'deposit_type')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'ustun: appointments.deposit_amount',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                         AND table_name = 'appointments' AND column_name = 'deposit_amount')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'ustun: payments.appointment_id',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                         AND table_name = 'payments' AND column_name = 'appointment_id')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'ustun: payments.group_id',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                         AND table_name = 'payments' AND column_name = 'group_id')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'ustun: attendance.group_id',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
                         AND table_name = 'attendance' AND column_name = 'group_id')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
-- Bu ikki funksiya yangi RLS siyosatlariga asos; bazada bo'lmasi shart.
SELECT 'funksiya: is_business_member',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                         WHERE n.nspname = 'public' AND p.proname = 'is_business_member')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'funksiya: branch_access_ok',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                         WHERE n.nspname = 'public' AND p.proname = 'branch_access_ok')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'rol: app_user',
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'index: payments_group_tuition_uniq',
       CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                         WHERE n.nspname = 'public' AND c.relname = 'payments_group_tuition_uniq')
            THEN 'bor' ELSE 'yo''q' END
UNION ALL
SELECT 'rol: app_service',
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN 'bor' ELSE 'yo''q' END;
