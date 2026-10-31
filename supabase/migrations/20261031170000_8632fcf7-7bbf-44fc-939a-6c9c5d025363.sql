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
