
REVOKE EXECUTE ON FUNCTION public.reserve_numbers(UUID, INTEGER[], UUID, TIMESTAMPTZ) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_numbers(UUID) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_numbers(UUID) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_raffle(UUID, INTEGER, TEXT, TEXT, TEXT, NUMERIC, INTEGER) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_raffle_numbers() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
