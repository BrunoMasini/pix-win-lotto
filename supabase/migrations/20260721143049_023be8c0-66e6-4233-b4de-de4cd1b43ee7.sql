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

DROP TRIGGER IF EXISTS seed_raffle_numbers_trigger ON public.raffles;
CREATE TRIGGER seed_raffle_numbers_trigger
AFTER INSERT ON public.raffles
FOR EACH ROW EXECUTE FUNCTION public.seed_raffle_numbers();

DO $$
DECLARE
  _rid uuid;
BEGIN
  SELECT id INTO _rid FROM public.raffles WHERE status = 'active' LIMIT 1;
  IF _rid IS NOT NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.raffles (title, description, image_url, price_per_number, total_numbers, status)
  VALUES (
    'Grande Sorteio: Air Fryer Elgin + R$ 500 no PIX!',
    'Concorra a uma Fritadeira Air Fryer Elgin Facilita Fry 3,5L (1400W, Preto) + R$ 500,00 no PIX. Escolha seus números da sorte por apenas R$ 25,00 cada!',
    '/air-fryer-prize.jpg',
    25.00,
    99,
    'active'
  );
END $$;