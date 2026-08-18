CREATE OR REPLACE FUNCTION public.increment_site_visits()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.site_visits SET count = count + 1, updated_at = now() WHERE id = 1 RETURNING count;
$$;

GRANT EXECUTE ON FUNCTION public.increment_site_visits() TO service_role;