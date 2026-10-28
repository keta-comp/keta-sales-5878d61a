-- KetaOne Faza 9.2: patient-data access must leave a journal the clinic itself can read.
-- Writes already go through the service-role client (logAudit); this only opens a read path,
-- scoped to the business and to the `medical.*` actions so no other tenant's history is exposed.
DROP POLICY IF EXISTS "business admins read own medical audit logs" ON public.audit_logs;
CREATE POLICY "business admins read own medical audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    business_id IS NOT NULL
    AND left(action, 8) = 'medical.'
    AND public.is_business_admin(business_id)
  );
