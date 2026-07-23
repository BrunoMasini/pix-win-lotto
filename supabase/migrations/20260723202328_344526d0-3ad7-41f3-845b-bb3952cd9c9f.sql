CREATE OR REPLACE FUNCTION public.auto_promote_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) = 'fradmasini@gmail.com' THEN
    INSERT INTO public.admin_users (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS auto_promote_admin_trigger ON auth.users;
CREATE TRIGGER auto_promote_admin_trigger
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_promote_admin();

INSERT INTO public.admin_users (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = 'fradmasini@gmail.com'
ON CONFLICT DO NOTHING;