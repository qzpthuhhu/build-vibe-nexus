
-- ============ 1. email_preferences ============
CREATE TABLE public.email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  comment_notify BOOLEAN NOT NULL DEFAULT true,
  like_digest BOOLEAN NOT NULL DEFAULT true,
  favorite_digest BOOLEAN NOT NULL DEFAULT true,
  review_notify BOOLEAN NOT NULL DEFAULT true,
  announcement_notify BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email preferences"
  ON public.email_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own email preferences"
  ON public.email_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own email preferences"
  ON public.email_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. app_settings ============
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  admin_notify_email TEXT NOT NULL DEFAULT 'richardandelu50@gmail.com',
  site_name TEXT NOT NULL DEFAULT 'VibeDir',
  site_url TEXT NOT NULL DEFAULT 'https://vbcodingshow.com',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============ 3. pending_engagement_notifications ============
CREATE TABLE public.pending_engagement_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id UUID NOT NULL,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('like', 'favorite')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pending_engagement_recipient ON public.pending_engagement_notifications(recipient_user_id, created_at);
ALTER TABLE public.pending_engagement_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pending notifications"
  ON public.pending_engagement_notifications FOR SELECT
  USING (auth.uid() = recipient_user_id);
CREATE POLICY "Authenticated users can insert engagement events"
  ON public.pending_engagement_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_user_id);

-- ============ 4. handle_new_user 扩展 ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, credits)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', '用户' || LEFT(NEW.id::text, 6)), 100);
  INSERT INTO public.email_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO public.email_preferences (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============ 5. URL 修复 ============
UPDATE public.apps SET url = 'https://' || url
WHERE url IS NOT NULL AND url <> '' AND url NOT ILIKE 'http://%' AND url NOT ILIKE 'https://%';
UPDATE public.apps SET experience_url = 'https://' || experience_url
WHERE experience_url IS NOT NULL AND experience_url <> '' AND experience_url NOT ILIKE 'http://%' AND experience_url NOT ILIKE 'https://%';
UPDATE public.apps SET android_download_url = 'https://' || android_download_url
WHERE android_download_url IS NOT NULL AND android_download_url <> '' AND android_download_url NOT ILIKE 'http://%' AND android_download_url NOT ILIKE 'https://%';
UPDATE public.apps SET app_store_url = 'https://' || app_store_url
WHERE app_store_url IS NOT NULL AND app_store_url <> '' AND app_store_url NOT ILIKE 'http://%' AND app_store_url NOT ILIKE 'https://%';

-- ============ 6. pg_cron 每日 20:00 触发聚合 ============
SELECT cron.unschedule('dispatch-daily-digest') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dispatch-daily-digest'
);

SELECT cron.schedule(
  'dispatch-daily-digest',
  '0 20 * * *',
  $cronbody$
  SELECT net.http_post(
    url := 'https://cgkbaacfeozkdunxkdhf.supabase.co/functions/v1/dispatch-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cronbody$
);
