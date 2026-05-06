
-- Token packages (pricing tiers)
CREATE TABLE public.token_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  token_amount bigint NOT NULL DEFAULT 0,
  rpm_limit integer NOT NULL DEFAULT 10,
  tpm_limit integer NOT NULL DEFAULT 100000,
  max_context integer NOT NULL DEFAULT 4096,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active packages" ON public.token_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage packages" ON public.token_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- API Keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default Key',
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  rpm_limit integer DEFAULT NULL,
  total_requests bigint NOT NULL DEFAULT 0,
  total_tokens_used bigint NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON public.api_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all api keys" ON public.api_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_api_keys_user ON public.api_keys (user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys (key_hash);

-- Token balances
CREATE TABLE public.token_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_balance bigint NOT NULL DEFAULT 0,
  used_balance bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own balance" ON public.token_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own balance" ON public.token_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages balances" ON public.token_balances FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Token orders
CREATE TABLE public.token_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.token_packages(id),
  amount_cents integer NOT NULL DEFAULT 0,
  token_amount bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.token_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.token_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all orders" ON public.token_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_token_orders_user ON public.token_orders (user_id);

-- API request logs
CREATE TABLE public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  model_requested text NOT NULL,
  model_actual text,
  provider text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  latency_ms integer,
  status_code integer,
  cost_cents numeric(10,4) DEFAULT 0,
  is_stream boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own logs" ON public.api_request_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages logs" ON public.api_request_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view all logs" ON public.api_request_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_api_logs_user ON public.api_request_logs (user_id, created_at DESC);
CREATE INDEX idx_api_logs_key ON public.api_request_logs (api_key_id);

-- Model mappings (admin-managed)
CREATE TABLE public.model_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_model text NOT NULL UNIQUE,
  target_model text NOT NULL,
  provider text NOT NULL DEFAULT 'minimax',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active mappings" ON public.model_mappings FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage mappings" ON public.model_mappings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_token_packages_updated_at BEFORE UPDATE ON public.token_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_token_balances_updated_at BEFORE UPDATE ON public.token_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_token_orders_updated_at BEFORE UPDATE ON public.token_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_model_mappings_updated_at BEFORE UPDATE ON public.model_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
