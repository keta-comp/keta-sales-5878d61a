-- KetaOne (Neon re-platform): billing_invoices is the table the Payme/Click webhooks and
-- the /dashboard/billing history read, yet no migration ever created it — it only existed
-- in the running database. Recreated here from the shipped column contract so a fresh
-- install can take payments.

CREATE SEQUENCE IF NOT EXISTS public.billing_invoices_invoice_no_seq;

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_no BIGINT NOT NULL DEFAULT nextval('public.billing_invoices_invoice_no_seq'::regclass),
  plan TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  provider_txn_id TEXT,
  provider_state INTEGER,
  provider_time BIGINT,
  perform_time TIMESTAMPTZ,
  cancel_time TIMESTAMPTZ,
  cancel_reason INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER SEQUENCE public.billing_invoices_invoice_no_seq
  OWNED BY public.billing_invoices.invoice_no;

-- Providers look invoices up by these keys, so both must be unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS billing_invoices_invoice_no_key ON public.billing_invoices (invoice_no);
CREATE UNIQUE INDEX IF NOT EXISTS billing_invoices_provider_txn_key
  ON public.billing_invoices (provider, provider_txn_id) WHERE provider_txn_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_invoices_business ON public.billing_invoices (business_id, created_at DESC);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.billing_invoices TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.billing_invoices_invoice_no_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.billing_invoices_invoice_no_seq TO service_role;
GRANT ALL ON public.billing_invoices TO service_role;
CREATE POLICY "billing_invoices tenant read" ON public.billing_invoices
  FOR SELECT TO authenticated USING (public.is_business_member(business_id));
CREATE POLICY "billing_invoices owner insert" ON public.billing_invoices
  FOR INSERT TO authenticated WITH CHECK (public.is_business_member(business_id));
CREATE TRIGGER billing_invoices_updated_at BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
