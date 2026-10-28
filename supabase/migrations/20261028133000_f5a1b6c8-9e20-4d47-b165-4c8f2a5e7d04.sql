-- The "operator" concept came from the previous sales-agent desk. KetaOne is a CRM:
-- the person who owns a lead, order or conversation is a team member, so every
-- operator pointer is repointed at business_members and the operators table goes away.
-- Assignment data survives: operators carried (business_id, user_id), which maps 1:1
-- to a business_members row.

BEGIN;

-- 1) Enum labels. RENAME VALUE keeps the type OID, so column types, policies and
--    functions that reference these enums are untouched and keep working.
ALTER TYPE public.lead_status RENAME VALUE 'needs_operator' TO 'needs_attention';
ALTER TYPE public.message_role RENAME VALUE 'operator' TO 'staff';

-- 2) Members that still held the 'operator' role become receptionists (they answered
--    incoming chats). Postgres cannot drop an enum label, so app_role keeps 'operator'
--    as an inert value; no code path can read or write it any more.
DELETE FROM public.user_roles ur
WHERE ur.role::text = 'operator'
  AND EXISTS (SELECT 1 FROM public.user_roles x WHERE x.user_id = ur.user_id AND x.role::text <> 'operator');
UPDATE public.user_roles SET role = 'receptionist' WHERE role::text = 'operator';
UPDATE public.business_members SET role = 'receptionist' WHERE role::text = 'operator';

-- 3) operator row -> membership row mapping (one membership per business + user).
CREATE TEMP TABLE operator_to_member ON COMMIT DROP AS
SELECT o.id AS operator_id, m.id AS member_id
FROM public.operators o
JOIN public.business_members m ON m.business_id = o.business_id AND m.user_id = o.user_id;

-- 4) Assignment columns. Rename first, drop the old FK, rewrite the values, then add
--    the new FK so the constraint is validated against clean data.
ALTER TABLE public.leads RENAME COLUMN assigned_operator_id TO assigned_member_id;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_operator_id_fkey;
UPDATE public.leads l SET assigned_member_id = map.member_id
FROM operator_to_member map WHERE l.assigned_member_id = map.operator_id;
UPDATE public.leads SET assigned_member_id = NULL WHERE assigned_member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = assigned_member_id);
ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_member_id_fkey FOREIGN KEY (assigned_member_id)
  REFERENCES public.business_members(id) ON DELETE SET NULL;

ALTER TABLE public.orders RENAME COLUMN assigned_operator_id TO assigned_member_id;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_assigned_operator_id_fkey;
UPDATE public.orders o SET assigned_member_id = map.member_id
FROM operator_to_member map WHERE o.assigned_member_id = map.operator_id;
UPDATE public.orders SET assigned_member_id = NULL WHERE assigned_member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = assigned_member_id);
ALTER TABLE public.orders
  ADD CONSTRAINT orders_assigned_member_id_fkey FOREIGN KEY (assigned_member_id)
  REFERENCES public.business_members(id) ON DELETE SET NULL;

ALTER TABLE public.customers RENAME COLUMN assigned_operator_id TO assigned_member_id;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_assigned_operator_id_fkey;
UPDATE public.customers c SET assigned_member_id = map.member_id
FROM operator_to_member map WHERE c.assigned_member_id = map.operator_id;
UPDATE public.customers SET assigned_member_id = NULL WHERE assigned_member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = assigned_member_id);
ALTER TABLE public.customers
  ADD CONSTRAINT customers_assigned_member_id_fkey FOREIGN KEY (assigned_member_id)
  REFERENCES public.business_members(id) ON DELETE SET NULL;

ALTER TABLE public.conversations RENAME COLUMN assigned_operator_id TO assigned_member_id;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_assigned_operator_id_fkey;
UPDATE public.conversations cv SET assigned_member_id = map.member_id
FROM operator_to_member map WHERE cv.assigned_member_id = map.operator_id;
UPDATE public.conversations SET assigned_member_id = NULL WHERE assigned_member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = assigned_member_id);
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_assigned_member_id_fkey FOREIGN KEY (assigned_member_id)
  REFERENCES public.business_members(id) ON DELETE SET NULL;

ALTER TABLE public.tasks RENAME COLUMN assigned_operator_id TO assigned_member_id;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_operator_id_fkey;
UPDATE public.tasks tk SET assigned_member_id = map.member_id
FROM operator_to_member map WHERE tk.assigned_member_id = map.operator_id;
UPDATE public.tasks SET assigned_member_id = NULL WHERE assigned_member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = assigned_member_id);
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_member_id_fkey FOREIGN KEY (assigned_member_id)
  REFERENCES public.business_members(id) ON DELETE SET NULL;

ALTER TABLE public.messages RENAME COLUMN operator_id TO member_id;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_operator_id_fkey;
UPDATE public.messages ms SET member_id = map.member_id
FROM operator_to_member map WHERE ms.member_id = map.operator_id;
UPDATE public.messages SET member_id = NULL WHERE member_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = member_id);
ALTER TABLE public.messages
  ADD CONSTRAINT messages_member_id_fkey FOREIGN KEY (member_id)
  REFERENCES public.business_members(id) ON DELETE SET NULL;

-- 5) Lead handover history becomes a membership record.
ALTER TABLE public.operator_assignments RENAME TO lead_assignments;
ALTER TABLE public.lead_assignments RENAME COLUMN operator_id TO member_id;
ALTER TABLE public.lead_assignments DROP CONSTRAINT IF EXISTS operator_assignments_operator_id_fkey;
UPDATE public.lead_assignments la SET member_id = map.member_id
FROM operator_to_member map WHERE la.member_id = map.operator_id;
DELETE FROM public.lead_assignments WHERE member_id IS NULL OR member_id NOT IN
  (SELECT id FROM public.business_members);
ALTER TABLE public.lead_assignments
  ADD CONSTRAINT lead_assignments_member_id_fkey FOREIGN KEY (member_id)
  REFERENCES public.business_members(id) ON DELETE CASCADE;

-- 6) The human-handoff Telegram group is staff, not operators.
ALTER TABLE public.business_settings RENAME COLUMN operator_group_chat_id TO staff_group_chat_id;

-- 7) Activity feeds labelled staff writes as 'operator'.
UPDATE public.activities SET actor = 'staff' WHERE actor = 'operator';
ALTER TABLE public.activities ALTER COLUMN actor SET DEFAULT 'staff';
UPDATE public.lead_events SET actor = 'staff' WHERE actor = 'operator';
UPDATE public.lead_events SET event_type = 'staff_notified' WHERE event_type = 'operator_notified';

-- 8) New signups no longer get an operators row (owner membership is enough).
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

  RETURN NEW;
END; $$;

-- 9) The operators table itself.
DROP TABLE public.operators;

COMMIT;
