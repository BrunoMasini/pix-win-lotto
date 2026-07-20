
-- Raffles table (versioning)
CREATE TABLE public.raffles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  price_per_number NUMERIC NOT NULL DEFAULT 25.00,
  total_numbers INTEGER NOT NULL DEFAULT 101,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished')),
  winner_number INTEGER,
  winner_name TEXT,
  winner_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT ON public.raffles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT ALL ON public.raffles TO service_role;

ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;

-- Only one active raffle at a time
CREATE UNIQUE INDEX one_active_raffle ON public.raffles (status) WHERE status = 'active';

CREATE TRIGGER update_raffles_updated_at
BEFORE UPDATE ON public.raffles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin users
CREATE TABLE public.admin_users (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check their own admin status"
ON public.admin_users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
$$;

-- Raffles RLS policies (public read all, admin write)
CREATE POLICY "Anyone can view raffles"
ON public.raffles FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert raffles"
ON public.raffles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update raffles"
ON public.raffles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete raffles"
ON public.raffles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Seed current raffle (Air Fryer)
INSERT INTO public.raffles (id, title, description, image_url, price_per_number, total_numbers, status)
VALUES (
  gen_random_uuid(),
  'Grande Sorteio: Air Fryer Elgin + R$ 500 no PIX!',
  'Concorra a uma Fritadeira Air Fryer Elgin Facilita Fry 3,5L (1400W, Preto) + R$ 500,00 no PIX. Escolha seus números da sorte por apenas R$ 25,00 cada!',
  '/air-fryer-prize.jpg',
  25.00,
  101,
  'active'
);

-- Add raffle_id to existing tables
ALTER TABLE public.raffle_numbers ADD COLUMN raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN raffle_id UUID REFERENCES public.raffles(id) ON DELETE SET NULL;

-- Backfill: assign existing raffle_numbers and orders to the newly-created active raffle
UPDATE public.raffle_numbers
SET raffle_id = (SELECT id FROM public.raffles WHERE status = 'active' LIMIT 1)
WHERE raffle_id IS NULL;

UPDATE public.orders
SET raffle_id = (SELECT id FROM public.raffles WHERE status = 'active' LIMIT 1)
WHERE raffle_id IS NULL;

ALTER TABLE public.raffle_numbers ALTER COLUMN raffle_id SET NOT NULL;

-- Change PK of raffle_numbers to (raffle_id, number)
ALTER TABLE public.raffle_numbers DROP CONSTRAINT raffle_numbers_pkey;
ALTER TABLE public.raffle_numbers ADD PRIMARY KEY (raffle_id, number);

-- Update RPCs to be raffle-aware
CREATE OR REPLACE FUNCTION public.reserve_numbers(_raffle_id UUID, _numbers INTEGER[], _order_id UUID, _expires_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_available BOOLEAN;
BEGIN
  SELECT bool_and(status = 'available') INTO all_available
  FROM public.raffle_numbers
  WHERE raffle_id = _raffle_id AND number = ANY(_numbers);

  IF NOT all_available OR all_available IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.raffle_numbers
  SET status = 'pending', order_id = _order_id, updated_at = now()
  WHERE raffle_id = _raffle_id AND number = ANY(_numbers);

  RETURN TRUE;
END;
$$;

-- Drop old signature
DROP FUNCTION IF EXISTS public.reserve_numbers(INTEGER[], UUID, TIMESTAMPTZ);

-- Admin policies on orders (in addition to backend-only)
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Finalize raffle function: sets winner + status finished, then starts a new active raffle
CREATE OR REPLACE FUNCTION public.finalize_raffle(
  _raffle_id UUID,
  _winner_number INTEGER,
  _new_title TEXT,
  _new_description TEXT,
  _new_image_url TEXT,
  _new_price NUMERIC,
  _new_total_numbers INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _winner_order_id UUID;
  _winner_name TEXT;
  _new_raffle_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Find winner (if number was sold)
  SELECT rn.order_id, o.buyer_name INTO _winner_order_id, _winner_name
  FROM public.raffle_numbers rn
  LEFT JOIN public.orders o ON o.id = rn.order_id
  WHERE rn.raffle_id = _raffle_id AND rn.number = _winner_number AND rn.status = 'paid';

  -- Mark raffle finished
  UPDATE public.raffles
  SET status = 'finished',
      winner_number = _winner_number,
      winner_name = COALESCE(_winner_name, 'Número não vendido'),
      winner_order_id = _winner_order_id,
      finished_at = now()
  WHERE id = _raffle_id;

  -- Create new active raffle
  INSERT INTO public.raffles (title, description, image_url, price_per_number, total_numbers, status)
  VALUES (_new_title, _new_description, _new_image_url, _new_price, _new_total_numbers, 'active')
  RETURNING id INTO _new_raffle_id;

  RETURN _new_raffle_id;
END;
$$;

-- Trigger to auto-populate raffle_numbers when a new raffle is inserted
CREATE OR REPLACE FUNCTION public.seed_raffle_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.raffle_numbers (raffle_id, number, status)
  SELECT NEW.id, gs, 'available'
  FROM generate_series(0, NEW.total_numbers - 1) AS gs;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_raffle_numbers_trigger
AFTER INSERT ON public.raffles
FOR EACH ROW EXECUTE FUNCTION public.seed_raffle_numbers();

-- Seed admin: fradmasini@gmail.com (if user exists in auth.users)
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'fradmasini@gmail.com'
ON CONFLICT DO NOTHING;
