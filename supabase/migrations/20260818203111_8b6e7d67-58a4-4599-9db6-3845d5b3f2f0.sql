REVOKE EXECUTE ON FUNCTION public.increment_site_visits() FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.increment_site_visits();