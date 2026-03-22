
-- 1. Extend app_status enum with 'draft' and 'offline'
ALTER TYPE public.app_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.app_status ADD VALUE IF NOT EXISTS 'offline';

-- 2. Add new columns to apps table
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 3. Create user_roles table (separate from profiles per security guidelines)
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Create app_media table
CREATE TABLE public.app_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media viewable by everyone" ON public.app_media
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own app media" ON public.app_media
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own app media" ON public.app_media
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.apps WHERE id = app_id AND user_id = auth.uid())
  );

-- 5. Create app_review_logs table
CREATE TABLE public.app_review_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  action text NOT NULL,
  operator_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view review logs" ON public.app_review_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert review logs" ON public.app_review_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 6. Update apps RLS to allow admins to view all apps
CREATE POLICY "Admins can view all apps" ON public.apps
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update all apps" ON public.apps
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete all apps" ON public.apps
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 7. Create storage bucket for app media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-media',
  'app-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf']
);

-- Storage RLS policies
CREATE POLICY "Anyone can view app media" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-media');

CREATE POLICY "Auth users can upload app media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'app-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (bucket_id = 'app-media' AND auth.uid()::text = (storage.foldername(name))[1]);
