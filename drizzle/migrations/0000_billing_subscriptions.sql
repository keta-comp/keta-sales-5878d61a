ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

CREATE TABLE public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no bigserial UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan text NOT NULL,
  amount numeric NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider_txn_id text,
  provider_state integer,
  provider_time bigint,
  perform_time timestamptz,
  cancel_time timestamptz,
  cancel_reason integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_invoices TO authenticated;
GRANT ALL ON public.billing_invoices TO service_role;
GRANT USAGE ON SEQUENCE public.billing_invoices_invoice_no_seq TO service_role;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own invoices" ON public.billing_invoices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = billing_invoices.business_id AND m.user_id = auth.uid()) OR public.is_super_admin());
CREATE INDEX billing_invoices_business_idx ON public.billing_invoices(business_id, created_at DESC);
CREATE UNIQUE INDEX billing_invoices_provider_txn_idx ON public.billing_invoices(provider, provider_txn_id) WHERE provider_txn_id IS NOT NULL;
CREATE TRIGGER billing_invoices_updated_at BEFORE UPDATE ON public.billing_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.my_access_state()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH b AS (
    SELECT b.* FROM public.business_members m JOIN public.businesses b ON b.id = m.business_id
    WHERE m.user_id = auth.uid() ORDER BY m.created_at ASC LIMIT 1
  )
  SELECT jsonb_build_object(
    'user_status', COALESCE((SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()), 'active'),
    'workspace_status', (SELECT status FROM b),
    'plan', (SELECT plan FROM b),
    'trial_ends_at', (SELECT trial_ends_at FROM b),
    'subscription_ends_at', (SELECT subscription_ends_at FROM b),
    'is_super_admin', public.is_super_admin(),
    'maintenance_mode', COALESCE((SELECT s.maintenance_mode FROM public.system_settings s LIMIT 1), false),
    'maintenance_message', (SELECT s.maintenance_message FROM public.system_settings s LIMIT 1)
  );
$function$;