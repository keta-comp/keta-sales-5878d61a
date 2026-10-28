-- Role-aware authorization (KetaOne Phase 1):
-- * business_role() / is_business_admin() helpers
-- * first admin of every business becomes owner
-- * member management: only owner/admin can update/remove members
-- * settings writes: only owner/admin
-- * new signups become owner of their business

CREATE OR REPLACE FUNCTION public.business_role(_business_id uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role
  FROM public.business_members m
  JOIN public.businesses b ON b.id = m.business_id
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.business_id = _business_id
    AND m.user_id = auth.uid()
    AND b.status <> 'suspended'
    AND p.status <> 'suspended'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.business_role(_business_id) IN ('owner', 'admin');
$$;

REVOKE ALL ON FUNCTION public.business_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated, service_role;

-- Promote the founding admin of each business to owner.
UPDATE public.business_members m SET role = 'owner'
FROM (
  SELECT DISTINCT ON (business_id) id
  FROM public.business_members
  WHERE role = 'admin'
  ORDER BY business_id, created_at ASC, id ASC
) founding
WHERE m.id = founding.id;

-- Member management by admins.
GRANT UPDATE, DELETE ON public.business_members TO authenticated;

CREATE POLICY "members admin update" ON public.business_members
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "members admin delete" ON public.business_members
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

-- Settings: members read, admins write.
DROP POLICY IF EXISTS "business_settings tenant" ON public.business_settings;
CREATE POLICY "business_settings member read" ON public.business_settings
  FOR SELECT TO authenticated USING (public.is_business_member(business_id));
CREATE POLICY "business_settings admin write" ON public.business_settings
  FOR ALL TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "ai_settings tenant" ON public.ai_settings;
CREATE POLICY "ai_settings member read" ON public.ai_settings
  FOR SELECT TO authenticated USING (public.is_business_member(business_id));
CREATE POLICY "ai_settings admin write" ON public.ai_settings
  FOR ALL TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

-- New users become the owner of the business created for them.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_business UUID;
  display_name TEXT;
  business_name TEXT;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  business_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), display_name);

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, display_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;

  INSERT INTO public.businesses (owner_id, name) VALUES (NEW.id, business_name)
  RETURNING id INTO new_business;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (new_business, NEW.id, 'owner') ON CONFLICT DO NOTHING;

  INSERT INTO public.business_settings (business_id, business_name)
  VALUES (new_business, business_name);

  INSERT INTO public.ai_settings (business_id) VALUES (new_business);

  INSERT INTO public.operators (business_id, user_id, full_name)
  VALUES (new_business, NEW.id, display_name);

  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
