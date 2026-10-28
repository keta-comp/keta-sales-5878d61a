-- Platform announcements need read receipts: the CRM bell shows which e'lonlar
-- a user has already seen, and the Control Center counts who actually read them.
CREATE TABLE public.notification_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notification reads select"
ON public.notification_reads FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "own notification reads insert"
ON public.notification_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "own notification reads delete"
ON public.notification_reads FOR DELETE TO authenticated
USING (user_id = auth.uid());

REVOKE ALL ON public.notification_reads FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;

CREATE INDEX notification_reads_notification_idx ON public.notification_reads (notification_id);
