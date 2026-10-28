-- Brief §7.3: permissions are enforced in the database, not only in the UI.
-- CRM structure (crm_configs) is admin-owned: every member may read it, only
-- owner/admin may create or rewrite it. Tenant isolation itself is unchanged.

BEGIN;

DROP POLICY IF EXISTS "crm_configs tenant" ON public.crm_configs;

CREATE POLICY "crm_configs member read" ON public.crm_configs
FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "crm_configs admin insert" ON public.crm_configs
FOR INSERT TO authenticated
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "crm_configs admin update" ON public.crm_configs
FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "crm_configs admin delete" ON public.crm_configs
FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

COMMIT;
