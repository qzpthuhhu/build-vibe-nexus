-- Single RPC for AI proxy preflight: auth + mapping + balance + rate limit
CREATE OR REPLACE FUNCTION public.ai_proxy_preflight(
  _key_hash text,
  _source_model text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key_row record;
  _mapping record;
  _provider record;
  _balance record;
  _recent_count int;
  _rpm int;
BEGIN
  -- 1. Verify API key
  SELECT id, user_id, status, rpm_limit
  INTO _key_row
  FROM api_keys
  WHERE key_hash = _key_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 401, 'error', 'Invalid API key');
  END IF;
  IF _key_row.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'status', 401, 'error', 'API key revoked');
  END IF;

  -- 2. Model mapping
  SELECT target_model, config, provider_id
  INTO _mapping
  FROM model_mappings
  WHERE source_model = _source_model AND is_active = true
  ORDER BY priority DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 400, 'error', format('Model %s not found', _source_model));
  END IF;

  -- 3. Provider
  SELECT base_url_openai, base_url_anthropic, api_key_ref, is_active
  INTO _provider
  FROM ai_providers
  WHERE id = _mapping.provider_id;

  IF NOT FOUND OR NOT _provider.is_active THEN
    RETURN jsonb_build_object('ok', false, 'status', 503, 'error', 'Provider unavailable');
  END IF;

  -- 4. Balance
  SELECT total_balance, used_balance
  INTO _balance
  FROM token_balances
  WHERE user_id = _key_row.user_id;

  IF NOT FOUND OR (_balance.total_balance - _balance.used_balance) < 100 THEN
    RETURN jsonb_build_object('ok', false, 'status', 402, 'error', 'Insufficient balance');
  END IF;

  -- 5. Rate limit (RPM)
  _rpm := COALESCE(_key_row.rpm_limit, 60);
  SELECT count(*) INTO _recent_count
  FROM api_request_logs
  WHERE api_key_id = _key_row.id
    AND created_at > now() - interval '1 minute';

  IF _recent_count >= _rpm THEN
    RETURN jsonb_build_object('ok', false, 'status', 429, 'error', 'Rate limit exceeded');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', _key_row.user_id,
    'api_key_id', _key_row.id,
    'target_model', _mapping.target_model,
    'config', COALESCE(_mapping.config, '{}'::jsonb),
    'base_url_openai', _provider.base_url_openai,
    'base_url_anthropic', _provider.base_url_anthropic,
    'api_key_ref', _provider.api_key_ref
  );
END;
$$;

-- Index to speed up rate-limit count
CREATE INDEX IF NOT EXISTS idx_api_request_logs_keyid_created
  ON public.api_request_logs (api_key_id, created_at DESC);

-- Combined billing + log + key stats update in one transaction
CREATE OR REPLACE FUNCTION public.ai_proxy_finalize(
  _user_id uuid,
  _api_key_id uuid,
  _model_requested text,
  _model_actual text,
  _prompt_tokens int,
  _completion_tokens int,
  _billed_tokens bigint,
  _latency_ms int,
  _status_code int,
  _is_stream boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deduct
  IF _billed_tokens > 0 THEN
    UPDATE token_balances
    SET used_balance = used_balance + _billed_tokens, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  -- Log
  INSERT INTO api_request_logs(
    user_id, api_key_id, model_requested, model_actual, provider,
    status_code, prompt_tokens, completion_tokens, total_tokens,
    latency_ms, is_stream, cost_cents
  ) VALUES (
    _user_id, _api_key_id, _model_requested, _model_actual, 'minimax',
    _status_code, _prompt_tokens, _completion_tokens, _prompt_tokens + _completion_tokens,
    _latency_ms, _is_stream, _billed_tokens
  );

  -- Update key stats
  UPDATE api_keys
  SET total_requests = total_requests + 1,
      total_tokens_used = total_tokens_used + (_prompt_tokens + _completion_tokens),
      last_used_at = now()
  WHERE id = _api_key_id;
END;
$$;