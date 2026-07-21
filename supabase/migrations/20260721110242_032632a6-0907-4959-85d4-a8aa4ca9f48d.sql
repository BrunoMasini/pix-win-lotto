
-- Change raffle range from 0..100 (101 numbers) to 1..99 (99 numbers)
ALTER TABLE public.raffles ALTER COLUMN total_numbers SET DEFAULT 99;

-- Rewrite seed function to generate 1..N
CREATE OR REPLACE FUNCTION public.seed_raffle_numbers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.raffle_numbers (raffle_id, number, status)
  SELECT NEW.id, gs, 'available'
  FROM generate_series(1, NEW.total_numbers) AS gs;
  RETURN NEW;
END;
$function$;

-- For the active raffle: remove numbers 0 and 100 if still available; then ensure 1..99 exist
DO $$
DECLARE
  _rid uuid;
BEGIN
  SELECT id INTO _rid FROM public.raffles WHERE status = 'active' LIMIT 1;
  IF _rid IS NULL THEN RETURN; END IF;

  -- Only delete if not sold/reserved
  DELETE FROM public.raffle_numbers
  WHERE raffle_id = _rid AND number IN (0, 100) AND status = 'available';

  -- Ensure 1..99 exist
  INSERT INTO public.raffle_numbers (raffle_id, number, status)
  SELECT _rid, gs, 'available'
  FROM generate_series(1, 99) AS gs
  ON CONFLICT DO NOTHING;

  UPDATE public.raffles SET total_numbers = 99 WHERE id = _rid;
END $$;
