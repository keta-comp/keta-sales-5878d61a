-- KetaOne Phase 7 (brief 5.4/5.10): customer consent, erasure timestamps and a
-- database-level guard so privacy rules hold even when the API layer is bypassed.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business_erased ON public.customers (business_id, erased_at);

CREATE OR REPLACE FUNCTION public.enforce_customer_privacy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.erased_at IS DISTINCT FROM OLD.erased_at THEN
    IF NOT public.is_business_admin(NEW.business_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Mijoz ma''lumotlarini o''chirish faqat ego yoki admin uchun.';
    END IF;
  END IF;
  IF OLD.erased_at IS NOT NULL
     AND (NEW.full_name IS DISTINCT FROM OLD.full_name
          OR NEW.phone IS DISTINCT FROM OLD.phone
          OR NEW.email IS DISTINCT FROM OLD.email) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'O''chirilgan mijozning aloqa ma''lumotlari tiklanmaydi.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS customers_privacy_enforce ON public.customers;
CREATE TRIGGER customers_privacy_enforce BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_privacy();
