REVOKE EXECUTE ON FUNCTION public.ai_proxy_preflight(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ai_proxy_finalize(uuid, uuid, text, text, int, int, bigint, int, int, boolean) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.ai_proxy_preflight(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_proxy_finalize(uuid, uuid, text, text, int, int, bigint, int, int, boolean) TO service_role;