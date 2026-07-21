CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raffle_numbers
  SET status = 'available', order_id = NULL, updated_at = now()
  WHERE status = 'pending'
    AND order_id IN (
      SELECT id FROM public.orders WHERE status = 'pending' AND expires_at < now()
    );

  UPDATE public.orders
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_stale_orders() FROM PUBLIC, anon, authenticated;