-- One plan vocabulary for the whole platform. The billing pages sell
-- start/pro/max, new workspaces are 'free'; the old Control Center dropdown
-- values (starter/business/enterprise) were never purchasable, so they fold
-- into the real ones instead of living on as unreachable states.
UPDATE public.businesses
SET plan = CASE plan
  WHEN 'starter' THEN 'start'
  WHEN 'business' THEN 'pro'
  WHEN 'enterprise' THEN 'max'
  ELSE 'free'
END
WHERE plan NOT IN ('free', 'start', 'pro', 'max');

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_plan_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_plan_check
  CHECK (plan IN ('free', 'start', 'pro', 'max'));

-- my_access_state() is the single server-side view of "what may this caller do".
-- It used to report only suspension/maintenance, so plan, trial/subscription dates
-- and the feature flags the Control Center edits had no consumer at all.
CREATE OR REPLACE FUNCTION public.my_access_state()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH biz AS (
    SELECT b.id, b.plan, b.status, b.trial_ends_at, b.subscription_ends_at
    FROM public.business_members m
    JOIN public.businesses b ON b.id = m.business_id
    WHERE m.user_id = auth.uid()
    ORDER BY m.created_at ASC
    LIMIT 1
  ),
  -- Only flags that actually address this workspace are reported; the rest stay
  -- absent so the caller falls back to the plan rules instead of a false "off".
  flags AS (
    SELECT jsonb_object_agg(f.key, f.enabled) AS features
    FROM public.feature_flags f, biz
    WHERE (f.target_business_id IS NULL OR f.target_business_id = biz.id)
      AND (f.target_plan IS NULL OR f.target_plan = biz.plan)
  )
  SELECT jsonb_build_object(
    'user_status', COALESCE((SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()), 'active'),
    'business_id', (SELECT id FROM biz),
    'workspace_status', (SELECT status FROM biz),
    'plan', (SELECT plan FROM biz),
    'trial_ends_at', (SELECT trial_ends_at FROM biz),
    'subscription_ends_at', (SELECT subscription_ends_at FROM biz),
    'is_super_admin', public.is_super_admin(),
    'maintenance_mode', COALESCE((SELECT s.maintenance_mode FROM public.system_settings s LIMIT 1), false),
    'maintenance_message', (SELECT s.maintenance_message FROM public.system_settings s LIMIT 1),
    'features', COALESCE((SELECT features FROM flags), '{}'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.my_access_state() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_access_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_access_state() TO authenticated, service_role;
