ALTER TABLE public.apps 
ADD COLUMN IF NOT EXISTS platform_type text,
ADD COLUMN IF NOT EXISTS access_type text,
ADD COLUMN IF NOT EXISTS experience_url text,
ADD COLUMN IF NOT EXISTS mini_program_qr_url text,
ADD COLUMN IF NOT EXISTS app_store_url text,
ADD COLUMN IF NOT EXISTS android_download_url text;