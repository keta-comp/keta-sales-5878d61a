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
