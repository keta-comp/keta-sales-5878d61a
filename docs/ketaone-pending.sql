-- KetaOne: bazada hali qo'llanilmagan 4 migratsiya (bitta faylda, ketma-ket)
-- 1) telegram_bot_state  2) attendance  3) qabul depoziti  4) study_groups + guruh a'zolari
-- Har bir DDL IF NOT EXISTS / DROP IF EXISTS bilan himoyalangan: qisman
-- qo'llangan bazada ham xatosiz ishlaydi, shuning uchun butun faylni qayta ishga tushirish mumkin.
-- Ishga tushirish: console.neon.tech > loyiha > SQL Editor > yangi query > yopishtir > Run

-- ============================================================
-- 20261030150000_b7f2c41d-9e35-4a68-b0c7-2d41ea8f6b19.sql
-- ============================================================
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

-- ============================================================
-- 20261030180000_bfca69cd-a519-4a90-a272-2a61fcec4060.sql
-- ============================================================
-- O‘quv markazlari uchun davomat. Avval "Davomat" oddiy crm_records moduli edi:
-- har bir o‘quvchiga alohida yozuv ochib, sanani qo‘lda kiritish kerak bo'lgani uchun
-- 30 kishilik guruhni belgilash o'n dehqon daqiqasi edi.
--
-- Bu jadval bitta mavjud mijoz (o‘quvchi/bemor) + sana + guruh uchun bitta yozuv saqlaydi,
-- shuning uchun ekran bir bosishda yozadi va qayta ochganda belgilangan holat turadi.

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'excused', 'late')),
  note TEXT NOT NULL DEFAULT '',
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT attendance_one_mark_per_day UNIQUE (business_id, student_id, lesson_date, group_name)
);

CREATE INDEX IF NOT EXISTS attendance_business_date_idx
  ON public.attendance (business_id, lesson_date);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Boshqa yadro jadvallari bilan bir xil chegara: biznes a'zosi + filial hududi.
-- Filial havolasi bo'lmagani uchun branch_access_ok(business_id, NULL) har doim ruxsat beradi.
DROP POLICY IF EXISTS "attendance tenant" ON public.attendance;
CREATE POLICY "attendance tenant" ON public.attendance FOR ALL TO app_user
  USING (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, NULL)
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, NULL)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO app_user;
GRANT ALL ON public.attendance TO app_service;

-- ============================================================
-- 20261031170000_8632fcf7-7bbf-44fc-939a-6c9c5d025363.sql
-- ============================================================
-- Qabul uchun depozit (oldindan to'lov).
--
-- Barbershop va salonda mijozning "kelmayman" demasi — eng katta yo'qotish: masterning
-- bo'sh turgan bir soati qaytarib bo'lmaydigan daromad. Depozit bronni ikki tomonlama
-- qiladi — mijoz vaqtni band qiladi, biznes esa pulni qo'lga kiritadi.
--
-- Ikki qism:
--   1) xizmatdagi QOIDA (qat'iy summa yoki narx foizi) — qoida o'zgarsa eski yozilishlar
--      o'zgarmaydi, shuning uchun summa qabulga snapshot bo'lib yoziladi;
--   2) qabuldagi HOLAT (kutilapti / qabul qilindi / qaytarildi) — pulning o'zi
--      To'lovlar daftariga (payments) yoziladi, shunda kassa va hisobotlar to'liq qoladi.

-- 1) Xizmat qoidasi.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'none'
    CHECK (deposit_type IN ('none', 'fixed', 'percent')),
  ADD COLUMN IF NOT EXISTS deposit_value NUMERIC(14,2) NOT NULL DEFAULT 0
    CHECK (deposit_value >= 0);

-- 2) Qabul snapshoti va holati.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(14,2)
    CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  ADD COLUMN IF NOT EXISTS deposit_paid_amount NUMERIC(14,2)
    CHECK (deposit_paid_amount IS NULL OR deposit_paid_amount >= 0),
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_method TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_refunded_at TIMESTAMPTZ;

-- Yarim holatlar ma'lumotlar bazasiga kirmasin: belgilangan depozit faqat
-- "qabul qilindi" yoki "qaytarildi" bo'ladi, ikkalasi bir vaqtda emas.
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_deposit_state;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_deposit_state CHECK (
  (deposit_refunded_at IS NULL AND deposit_paid_at IS NULL AND deposit_paid_amount IS NULL)
  OR (deposit_refunded_at IS NULL AND deposit_paid_at IS NOT NULL AND deposit_paid_amount IS NOT NULL)
  OR (deposit_refunded_at IS NOT NULL)
);

-- Kutilayotgan depozitlar ro'yxati (filtr va KPI) shu qismiy indeksdan foydalanadi.
CREATE INDEX IF NOT EXISTS idx_appointments_deposit_pending
  ON public.appointments (business_id, starts_at)
  WHERE deposit_amount > 0 AND deposit_paid_at IS NULL;

-- 3) Depozit puli To'lovlar daftarida qabulga bog'lanib turadi.
--    ON DELETE SET NULL: qabul o'chirilsa ham pul yozuvi saqlanadi (buxgalteriya izi).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_appointment_idx ON public.payments (appointment_id);

-- ============================================================
-- 20261031190000_4c1f7d2a-9b83-42e6-8a51-6d0c7b34e9f2.sql
-- ============================================================
-- O‘quv markazi yo‘nalishi uchun haqiqiy obyektlar: Kurs, Guruh va guruh a'zolari.
--
-- Avval holat: “Kurslar” mahsulot jadveliga (SKU, zaxira, kam zaxira) yozilardi,
-- “Guruhlar” esa crm_records ichida erkin matn edi. Shuning uchun o‘quvchini
-- qo‘shganda qaysi guruhga ketishi ma'lum emas, davomat ro‘yxati esa avvalgi
-- belgilardan taxmin qilinardi.
--
-- Kurs = `services` yozuvi (nomi, dars davomiyligi, narxi, xodim foizi allaqachon
-- shu jadvalda), guruh esa kursga bog‘lanadi. Shunda oylik hisobi va o‘qituvchi
-- haqi mavjud moliya va ish haqi mexanizmlariga chidamli bo‘ladi.
--
-- Jadval nomlarida `groups` o'rniga `study_groups` tanlandi: `GROUPS` PostgreSQL
-- 15+ da kalit so'z sifatida paydo bo'lgan, nomni kvotsiz yozish xatoga olib keladi.

CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  teacher_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  -- 0 = guruh narxi kursning `services.price` qiymatidan olinadi.
  monthly_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  -- 0 = sig'im cheklanmagan.
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  -- Dars kunlari: 1=Dushanba ... 7=Yakshanba, vergul bilan ("1,3,5").
  lesson_days TEXT NOT NULL DEFAULT '',
  starts_on DATE,
  ends_on DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('collecting', 'active', 'finished', 'archived')),
  note TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT study_groups_one_name_per_business UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS study_groups_business_idx
  ON public.study_groups (business_id, status);
CREATE INDEX IF NOT EXISTS study_groups_course_idx
  ON public.study_groups (course_id);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_groups tenant" ON public.study_groups;
CREATE POLICY "study_groups tenant" ON public.study_groups FOR ALL TO app_user
  USING (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, NULL)
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, NULL)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO app_user;
GRANT ALL ON public.study_groups TO app_service;

-- O‘quvchi ↔ guruh bog‘lamasi. Bitta o‘quvchi bir necha guruhda bo‘lishi mumkin,
-- lekin bir guruhda ikki marta yozilmaydi.
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- Shaxsiy narx (chegirma yoki grant). NULL bo‘lsa guruh, u ham 0 bo‘lsa kurs narxi.
  monthly_price NUMERIC(14,2) CHECK (monthly_price IS NULL OR monthly_price >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, student_id)
);

CREATE INDEX IF NOT EXISTS group_members_business_idx
  ON public.group_members (business_id);
CREATE INDEX IF NOT EXISTS group_members_student_idx
  ON public.group_members (student_id, status);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_members tenant" ON public.group_members;
CREATE POLICY "group_members tenant" ON public.group_members FOR ALL TO app_user
  USING (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, NULL)
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, NULL)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO app_user;
GRANT ALL ON public.group_members TO app_service;

-- Davomat endi guruhga to‘g‘ridan-to‘g‘ri bog‘lanadi. `group_name` eski yozuvlar
-- uchun saqlanib qoladi va yangi belgilarda ham ko‘rinadigan nomni yo‘qotmaslik
-- uchun yozib boriladi.
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS attendance_group_date_idx
  ON public.attendance (business_id, group_id, lesson_date);

-- Oylik to‘lov guruh va davrga bog‘lanadi: shunda “bu oy uchun yozuvlar yaratish”
-- bir bosishda bajariladi va qarzdorlik o‘qituvchi haqiga asos bo‘ladi.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period_month TEXT
    CHECK (period_month IS NULL OR period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

CREATE INDEX IF NOT EXISTS payments_group_period_idx
  ON public.payments (business_id, group_id, period_month);

-- “Oylik hisoblash” ikki marta bosilsa (ikki brauzer, bir-ikki soniya oralikda)
-- tekshirish va yozish orasidagi bo'shliqdan ikkita bir xil qoldiq yozuv chiqadi.
-- Bu qismiy unikal index bitta o‘quvchiga bitta guruh va oy uchun faqat bitta
-- kutilayotgan oylik yozuviga ruxsat beradi; to‘langan/partial qatorlar cheklanmaydi,
-- shuning uchun qisman to‘lovlar avvalgideki yozilaveradi.
CREATE UNIQUE INDEX IF NOT EXISTS payments_group_tuition_uniq
  ON public.payments (business_id, group_id, customer_id, period_month)
  WHERE group_id IS NOT NULL AND period_month IS NOT NULL AND status = 'pending';

