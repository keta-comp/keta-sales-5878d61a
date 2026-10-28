-- KetaOne Phase 3 (brief 5.2/5.5): six-state appointment flow, schedule-aware conflict
-- window and price snapshot on appointments.

-- ============ six appointment states ============
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'new';

UPDATE public.appointments SET status = 'confirmed' WHERE status = 'scheduled';

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('new', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'));

-- Booked slots now span new/confirmed/arrived; rebuild the exclusion on that set.
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_double_booking;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_double_booking
  EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status IN ('new', 'confirmed', 'arrived') AND employee_id IS NOT NULL);

-- ============ history-safe snapshots (brief 5.5) ============
-- Keep the service name/price/duration at booking time so later catalog edits
-- cannot rewrite past appointments or reports.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_name TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) CHECK (price >= 0),
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER CHECK (duration_minutes > 0 AND duration_minutes <= 1440);

-- Backfill from the linked service where the snapshot is still empty.
UPDATE public.appointments a
SET service_name = s.name,
    price = s.price,
    duration_minutes = EXTRACT(EPOCH FROM (a.ends_at - a.starts_at))::int / 60
FROM public.services s
WHERE a.service_id = s.id
  AND (a.service_name IS NULL OR a.price IS NULL OR a.duration_minutes IS NULL);
