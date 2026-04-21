-- ============================================================
-- 1. Storage: enforce path ownership on app-media INSERT
-- ============================================================
DROP POLICY IF EXISTS "Auth users can upload app media" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload own app media" ON storage.objects;

CREATE POLICY "Auth users can upload own app media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Also restrict UPDATE on storage.objects for app-media to own folder
DROP POLICY IF EXISTS "Auth users can update own app media" ON storage.objects;
CREATE POLICY "Auth users can update own app media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'app-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'app-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ============================================================
-- 2. apps.contact_info: restrict to owner + admins via column grants
-- ============================================================
-- Revoke public/anon/authenticated SELECT on contact_info column,
-- then expose it through a SECURITY DEFINER helper function.
REVOKE SELECT (contact_info) ON public.apps FROM anon, authenticated;

-- Helper function: returns contact_info only if caller is owner or admin
CREATE OR REPLACE FUNCTION public.get_app_contact_info(_app_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.contact_info
  FROM public.apps a
  WHERE a.id = _app_id
    AND (
      a.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_app_contact_info(uuid) TO anon, authenticated;

-- ============================================================
-- 3. apps UPDATE: prevent non-admin users from changing privileged columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_apps_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Service role bypasses checks
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role)
           OR public.has_role(auth.uid(), 'super_admin'::app_role);

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admins: forbid changes to privileged columns
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to modify status';
  END IF;
  IF NEW.is_boosted IS DISTINCT FROM OLD.is_boosted THEN
    RAISE EXCEPTION 'Not allowed to modify is_boosted';
  END IF;
  IF NEW.boost_expires_at IS DISTINCT FROM OLD.boost_expires_at THEN
    RAISE EXCEPTION 'Not allowed to modify boost_expires_at';
  END IF;
  IF NEW.likes_count IS DISTINCT FROM OLD.likes_count THEN
    RAISE EXCEPTION 'Not allowed to modify likes_count';
  END IF;
  IF NEW.favorites_count IS DISTINCT FROM OLD.favorites_count THEN
    RAISE EXCEPTION 'Not allowed to modify favorites_count';
  END IF;
  IF NEW.views IS DISTINCT FROM OLD.views THEN
    RAISE EXCEPTION 'Not allowed to modify views';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Not allowed to modify approved_at';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed to modify user_id';
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'Not allowed to modify rejection_reason';
  END IF;
  IF NEW.review_note IS DISTINCT FROM OLD.review_note THEN
    RAISE EXCEPTION 'Not allowed to modify review_note';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_apps_privileged_columns_trg ON public.apps;
CREATE TRIGGER protect_apps_privileged_columns_trg
BEFORE UPDATE ON public.apps
FOR EACH ROW
EXECUTE FUNCTION public.protect_apps_privileged_columns();

-- Add WITH CHECK to existing user UPDATE policy (also blocks ownership transfer)
DROP POLICY IF EXISTS "Users can update own apps" ON public.apps;
CREATE POLICY "Users can update own apps"
ON public.apps
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);