-- KetaOne Phase 5 (brief 5.7): payroll rules, per-service commission overrides and
-- monthly payroll statements with an approval/payment trail.

ALTER TABLE public.employee_services
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) CHECK (commission_percent >= 0 AND commission_percent <= 100);

CREATE TABLE IF NOT EXISTS public.payroll_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_rules_business ON public.payroll_rules (business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_rules TO authenticated;
GRANT ALL ON public.payroll_rules TO service_role;
ALTER TABLE public.payroll_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_rules tenant" ON public.payroll_rules FOR ALL TO authenticated
  USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));
CREATE TRIGGER payroll_rules_updated_at BEFORE UPDATE ON public.payroll_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.payroll_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  service_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (service_revenue >= 0),
  base_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
  commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  advance_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deduction_amount >= 0),
  total_computed NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'paid')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  CONSTRAINT payroll_statement_period UNIQUE (business_id, employee_id, period_start)
);
CREATE INDEX IF NOT EXISTS idx_payroll_statements_business_period
  ON public.payroll_statements (business_id, period_start);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_statements TO authenticated;
GRANT ALL ON public.payroll_statements TO service_role;
ALTER TABLE public.payroll_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_statements tenant" ON public.payroll_statements FOR ALL TO authenticated
  USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));
CREATE TRIGGER payroll_statements_updated_at BEFORE UPDATE ON public.payroll_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payroll is a finance concern: only owner/admin/manager may write it.
-- Members read through their branch-free tenant policy; writes are gated in
-- server functions via the finance.view/members.manage permission chain.
