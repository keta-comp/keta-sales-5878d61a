-- KetaOne brief Phase 1: branches — multi-branch businesses with branch-scoped access.

-- ============ branches ============
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS branches_business_name ON public.branches (business_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_branches_business ON public.branches (business_id, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches tenant" ON public.branches FOR ALL TO authenticated
  USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id));
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ branch scoping columns ============
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_business_branch ON public.appointments (business_id, branch_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_expenses_business_branch ON public.expenses (business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_branch ON public.employees (business_id, branch_id);

-- ============ branch-scoped access helper ============
-- Owner/admin and members without an assigned branch see everything;
-- branch-assigned staff only see rows of their branch (NULL branch = shared/head-office rows).
CREATE OR REPLACE FUNCTION public.branch_access_ok(_business_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH caller AS (
    SELECT bm.branch_id AS member_branch
    FROM public.business_members bm
    WHERE bm.business_id = _business_id AND bm.user_id = auth.uid()
    LIMIT 1
  )
  SELECT CASE
    WHEN public.is_business_admin(_business_id) THEN true
    WHEN (SELECT member_branch FROM caller) IS NULL THEN true
    WHEN _branch_id IS NULL THEN true
    ELSE (SELECT member_branch FROM caller) = _branch_id
  END
$$;

REVOKE ALL ON FUNCTION public.branch_access_ok(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.branch_access_ok(UUID, UUID) TO authenticated, service_role;

-- ============ replace tenant policies with branch-aware versions ============
DROP POLICY IF EXISTS "appointments tenant" ON public.appointments;
CREATE POLICY "appointments tenant" ON public.appointments FOR ALL TO authenticated
  USING (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, branch_id)
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, branch_id)
  );

DROP POLICY IF EXISTS "expenses tenant" ON public.expenses;
CREATE POLICY "expenses tenant" ON public.expenses FOR ALL TO authenticated
  USING (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, branch_id)
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, branch_id)
  );

DROP POLICY IF EXISTS "cash_sessions tenant" ON public.cash_sessions;
CREATE POLICY "cash_sessions tenant" ON public.cash_sessions FOR ALL TO authenticated
  USING (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, branch_id)
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND public.branch_access_ok(business_id, branch_id)
  );
