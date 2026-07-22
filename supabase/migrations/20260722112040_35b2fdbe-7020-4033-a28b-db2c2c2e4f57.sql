
-- Nova RPC que confirma o pagamento mesmo se o pedido já estiver expirado,
-- desde que os números ainda estejam disponíveis ou pertençam ao próprio pedido.
CREATE OR REPLACE FUNCTION public.confirm_numbers_force(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _conflict INTEGER[];
BEGIN
  SELECT id, raffle_id, numbers, status
    INTO _order
    FROM public.orders
   WHERE id = _order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF _order.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_paid');
  END IF;

  -- Detectar conflitos: números já pagos/reservados por OUTRO pedido
  SELECT array_agg(number) INTO _conflict
  FROM public.raffle_numbers
  WHERE raffle_id = _order.raffle_id
    AND number = ANY(_order.numbers)
    AND status IN ('paid', 'pending')
    AND (order_id IS DISTINCT FROM _order_id);

  IF _conflict IS NOT NULL AND array_length(_conflict, 1) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict', 'numbers', _conflict);
  END IF;

  UPDATE public.raffle_numbers
     SET status = 'paid',
         order_id = _order_id,
         updated_at = now()
   WHERE raffle_id = _order.raffle_id
     AND number = ANY(_order.numbers);

  UPDATE public.orders
     SET status = 'paid',
         paid_at = COALESCE(paid_at, now())
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Aumentar a janela do expire_stale_orders para 2 minutos para dar tempo do webhook chegar.
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
      SELECT id FROM public.orders
      WHERE status = 'pending'
        AND expires_at < (now() - interval '2 minutes')
    );

  UPDATE public.orders
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < (now() - interval '2 minutes');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_numbers_force(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_numbers_force(uuid) TO service_role;
