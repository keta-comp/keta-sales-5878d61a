-- Phase 0 hardening:
-- 1) Prevent duplicate open leads per (business, customer, product).
-- 2) Make customers.instagram_user_id unique per tenant instead of globally.
-- 3) Add critical CHECK constraints as NOT VALID (enforced for new writes only).

-- ============ 1. leads deduplication ============
-- Remove existing duplicate open leads, keeping the earliest of each group.
DELETE FROM public.leads l
USING public.leads keep
WHERE l.status NOT IN ('won', 'lost')
  AND keep.status NOT IN ('won', 'lost')
  AND l.business_id = keep.business_id
  AND l.customer_id = keep.customer_id
  AND l.product_id IS NOT DISTINCT FROM keep.product_id
  AND (keep.created_at, keep.id) < (l.created_at, l.id);

CREATE UNIQUE INDEX IF NOT EXISTS leads_open_dedup_uidx
  ON public.leads (business_id, customer_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status NOT IN ('won', 'lost');

-- ============ 2. instagram_user_id per tenant ============
DROP INDEX IF EXISTS public.customers_instagram_user_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS customers_instagram_user_uidx
  ON public.customers (business_id, instagram_user_id)
  WHERE instagram_user_id IS NOT NULL;

-- ============ 3. data integrity CHECKs (NOT VALID) ============
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0) NOT VALID,
  ADD CONSTRAINT order_items_unit_price_non_negative CHECK (unit_price >= 0) NOT VALID,
  ADD CONSTRAINT order_items_line_total_non_negative CHECK (line_total >= 0) NOT VALID;

ALTER TABLE public.products
  ADD CONSTRAINT products_price_non_negative CHECK (price >= 0) NOT VALID,
  ADD CONSTRAINT products_stock_non_negative CHECK (stock_quantity >= 0) NOT VALID,
  ADD CONSTRAINT products_reserved_non_negative CHECK (reserved_quantity >= 0) NOT VALID;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_total_non_negative CHECK (total >= 0) NOT VALID;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0) NOT VALID;

-- Index used by the failed-login throttle in session.functions.ts.
CREATE INDEX IF NOT EXISTS audit_logs_login_failed_idx
  ON public.audit_logs (action, created_at DESC)
  WHERE action = 'login_failed';
