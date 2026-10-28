-- KetaOne Phase 7 (monitoring): a durable server-side error trail readable only by
-- the platform service role, so business tenants never see each other's failures.
-- (fingerprint, bucket) collapses repeat storms into one row per ten minutes.

CREATE TABLE IF NOT EXISTS public.error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL,
  bucket TIMESTAMPTZ NOT NULL,
  level TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warning')),
  route TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  status_code INTEGER,
  business_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fingerprint, bucket)
);
CREATE INDEX IF NOT EXISTS idx_error_events_created ON public.error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_route ON public.error_events (route);

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.error_events FROM anon, authenticated;
GRANT ALL ON public.error_events TO service_role;
