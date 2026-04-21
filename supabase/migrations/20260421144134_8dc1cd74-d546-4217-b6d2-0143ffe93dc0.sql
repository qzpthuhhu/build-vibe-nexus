-- 1. Set search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 2. Restrict app-media listing: keep direct file URLs working, but block listing
-- The bucket is public so direct getPublicUrl works regardless of RLS.
-- We just need to prevent SELECT (which enables LIST via the API).
DROP POLICY IF EXISTS "App media files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read app media" ON storage.objects;

-- Allow SELECT only for own folder (so users can list their own uploads in admin UI)
CREATE POLICY "Users can list own app media files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'app-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Admins can list all
CREATE POLICY "Admins can list all app media files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'app-media'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);