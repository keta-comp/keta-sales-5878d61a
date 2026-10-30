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
