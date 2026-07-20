
CREATE TYPE public.raffle_number_status AS ENUM ('available', 'pending', 'paid');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'expired', 'cancelled');

CREATE TABLE public.raffle_numbers (
  number integer PRIMARY KEY CHECK (number >= 0 AND number <= 100),
  status public.raffle_number_status NOT NULL DEFAULT 'available',
  order_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.raffle_numbers TO anon;
GRANT SELECT ON public.raffle_numbers TO authenticated;
GRANT ALL ON public.raffle_numbers TO service_role;

ALTER TABLE public.raffle_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view raffle numbers" ON public.raffle_numbers
  FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numbers integer[] NOT NULL,
  amount numeric(10,2) NOT NULL,
  buyer_name text NOT NULL,
  buyer_whatsapp text NOT NULL,
  buyer_email text NOT NULL,
  buyer_cpf text NOT NULL,
  mp_payment_id text,
  pix_qr_code_base64 text,
  pix_copia_cola text,
  status public.order_status NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_numbers(_numbers integer[], _order_id uuid, _expires_at timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_available boolean;
BEGIN
  SELECT bool_and(status = 'available') INTO all_available
  FROM public.raffle_numbers
  WHERE number = ANY(_numbers);

  IF NOT all_available OR all_available IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.raffle_numbers
  SET status = 'pending', order_id = _order_id, updated_at = now()
  WHERE number = ANY(_numbers);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_numbers(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raffle_numbers
  SET status = 'available', order_id = NULL, updated_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  UPDATE public.orders
  SET status = 'expired'
  WHERE id = _order_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_numbers(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raffle_numbers
  SET status = 'paid', updated_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  UPDATE public.orders
  SET status = 'paid', paid_at = now()
  WHERE id = _order_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_numbers(integer[], uuid, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_numbers(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_numbers(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_raffle_numbers_updated_at
BEFORE UPDATE ON public.raffle_numbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.raffle_numbers (number) SELECT generate_series(0, 100);

ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_numbers;
