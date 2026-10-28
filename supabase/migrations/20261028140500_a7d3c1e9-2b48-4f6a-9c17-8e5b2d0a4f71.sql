-- KetaOne (Neon re-platform): the billing columns the app has always read were never
-- given a migration — they existed only in the running database. Without them
-- my_access_state() cannot be created, so the schema is incomplete on a fresh install.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_businesses_trial_ends_at ON public.businesses (trial_ends_at);
