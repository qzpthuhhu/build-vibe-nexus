
-- Create ai_providers table
CREATE TABLE public.ai_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  base_url_openai TEXT,
  base_url_anthropic TEXT,
  api_key_ref TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage providers
CREATE POLICY "Admins manage providers"
ON public.ai_providers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add provider_id to model_mappings
ALTER TABLE public.model_mappings
ADD COLUMN provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL;

-- Trigger for updated_at on ai_providers
CREATE TRIGGER update_ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
