-- 1. New table for contact info
CREATE TABLE IF NOT EXISTS public.app_contact_info (
  app_id uuid PRIMARY KEY REFERENCES public.apps(id) ON DELETE CASCADE,
  contact_info text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_contact_info ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own
CREATE POLICY "Owner can view contact info"
ON public.app_contact_info
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.apps a WHERE a.id = app_contact_info.app_id AND a.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Owner can insert contact info"
ON public.app_contact_info
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.apps a WHERE a.id = app_contact_info.app_id AND a.user_id = auth.uid())
);

CREATE POLICY "Owner can update contact info"
ON public.app_contact_info
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.apps a WHERE a.id = app_contact_info.app_id AND a.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.apps a WHERE a.id = app_contact_info.app_id AND a.user_id = auth.uid())
);

CREATE POLICY "Owner can delete contact info"
ON public.app_contact_info
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.apps a WHERE a.id = app_contact_info.app_id AND a.user_id = auth.uid())
);

CREATE POLICY "Admins manage all contact info"
ON public.app_contact_info
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_app_contact_info_updated_at
BEFORE UPDATE ON public.app_contact_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing data
INSERT INTO public.app_contact_info (app_id, contact_info)
SELECT id, contact_info FROM public.apps WHERE contact_info IS NOT NULL AND contact_info <> ''
ON CONFLICT (app_id) DO NOTHING;

-- 3. Restore the column-level grant we revoked, then drop the column
GRANT SELECT (contact_info) ON public.apps TO anon, authenticated;
ALTER TABLE public.apps DROP COLUMN contact_info;

-- 4. Update helper RPC to read from new table
CREATE OR REPLACE FUNCTION public.get_app_contact_info(_app_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.contact_info
  FROM public.app_contact_info c
  JOIN public.apps a ON a.id = c.app_id
  WHERE c.app_id = _app_id
    AND (
      a.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    );
$$;