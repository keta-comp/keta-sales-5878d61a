-- KetaOne Phase 6: opt-in Telegram notification flag for new online bookings.
-- Notifications stay best-effort and per-link; nothing sends unless the owner
-- links Telegram and enables this flag.

ALTER TABLE public.telegram_links
  ADD COLUMN IF NOT EXISTS notify_booking BOOLEAN NOT NULL DEFAULT false;
