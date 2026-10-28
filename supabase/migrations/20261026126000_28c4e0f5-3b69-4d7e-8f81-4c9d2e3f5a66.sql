-- KetaOne Phase 4 (brief 5.3): public online booking — business slug, shareable page,
-- spam throttling for anonymous booking requests.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE CHECK (booking_slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN NOT NULL DEFAULT true;

-- Deterministic backfill for existing businesses.
UPDATE public.businesses
SET booking_slug = left(md5(id::text), 10)
WHERE booking_slug IS NULL;

-- Anonymous booking attempts: throttle repeated submissions per phone/business.
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_requests_business_phone_time
  ON public.booking_requests (business_id, phone, created_at DESC);

GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
-- No authenticated policies: only the service-role server path may read/write it.
