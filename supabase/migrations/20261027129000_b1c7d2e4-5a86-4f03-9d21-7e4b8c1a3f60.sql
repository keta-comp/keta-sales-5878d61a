-- KetaOne Phase 7 hardening: a paid payroll statement must appear in the finance
-- ledger, and expenses/cash_sessions need the tenant default their inserts rely on.

ALTER TABLE public.payroll_statements
  ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_method TEXT NOT NULL DEFAULT 'cash';

CREATE INDEX IF NOT EXISTS idx_payroll_statements_expense ON public.payroll_statements (expense_id);

ALTER TABLE public.expenses ALTER COLUMN business_id SET DEFAULT public.current_business_id();
ALTER TABLE public.cash_sessions ALTER COLUMN business_id SET DEFAULT public.current_business_id();
