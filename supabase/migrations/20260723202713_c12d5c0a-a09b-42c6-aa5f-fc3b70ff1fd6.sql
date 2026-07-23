DROP TRIGGER IF EXISTS auto_promote_admin_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_promote_admin();