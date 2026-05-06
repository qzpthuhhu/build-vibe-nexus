
-- Index for rate limiting: lookup recent requests by api_key
CREATE INDEX IF NOT EXISTS idx_api_request_logs_key_time
  ON public.api_request_logs (api_key_id, created_at DESC);

-- Index for dashboard: lookup by user + time
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_time
  ON public.api_request_logs (user_id, created_at DESC);

-- Atomic token deduction function (returns remaining balance, or -1 if insufficient)
CREATE OR REPLACE FUNCTION public.deduct_tokens(
  _user_id uuid,
  _amount bigint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining bigint;
BEGIN
  UPDATE public.token_balances
  SET used_balance = used_balance + _amount,
      updated_at = now()
  WHERE user_id = _user_id
    AND (total_balance - used_balance) >= _amount
  RETURNING (total_balance - used_balance) INTO _remaining;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN _remaining;
END;
$$;
