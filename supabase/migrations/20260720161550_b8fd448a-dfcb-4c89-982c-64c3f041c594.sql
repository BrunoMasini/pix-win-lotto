
REVOKE EXECUTE ON FUNCTION public.reserve_numbers(integer[], uuid, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_numbers(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_numbers(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_numbers(integer[], uuid, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_numbers(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_numbers(uuid) TO service_role;
