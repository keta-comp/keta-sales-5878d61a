-- KetaOne Phase 7+ (branding): a public booking page must carry the business's own
-- identity — phone number and logo. The logo lives in a public storage bucket keyed
-- by business id, so the object path itself is the tenant boundary.
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_path TEXT NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('branding', 'branding', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Only members of the business named by the first path segment may touch the object.
DROP POLICY IF EXISTS "branding member write" ON storage.objects;
CREATE POLICY "branding member write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'branding'
    AND exists (
      select 1 from public.business_members bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND exists (
      select 1 from public.business_members bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = auth.uid()
    )
  );
