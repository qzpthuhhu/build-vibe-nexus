
ALTER TABLE public.apps
  ADD COLUMN monetization_stage text,
  ADD COLUMN is_for_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN price text,
  ADD COLUMN contact_info text;
