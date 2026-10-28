-- KetaOne Faza 9.2: patient documents (rentgen, tahlil natijalari, tibbiy hujjatlar)
-- must never be publicly readable. Objects live in a private bucket whose first path
-- segment is the business id, so the path itself is the tenant boundary — the same
-- shape the branding bucket already uses. Reads only happen through short-lived signed
-- URLs minted by a server function that re-checks the caller's medical.view right.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm_attachments',
  'crm_attachments',
  false,
  15728640,
  ARRAY['image/png','image/jpeg','image/webp','image/tiff','application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Members of the business named by the first path segment may upload, read and replace
-- their own objects; nothing crosses that boundary.
DROP POLICY IF EXISTS "crm attachments member insert" ON storage.objects;
CREATE POLICY "crm attachments member insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crm_attachments'
    AND exists (
      select 1 from public.business_members bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "crm attachments member read" ON storage.objects;
CREATE POLICY "crm attachments member read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'crm_attachments'
    AND exists (
      select 1 from public.business_members bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "crm attachments member delete" ON storage.objects;
CREATE POLICY "crm attachments member delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'crm_attachments'
    AND exists (
      select 1 from public.business_members bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = auth.uid()
    )
  );
