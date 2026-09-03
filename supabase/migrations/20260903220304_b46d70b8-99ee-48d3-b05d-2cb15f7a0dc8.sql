ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activated_at timestamptz;

UPDATE public.profiles SET activated_at = COALESCE(activated_at, now());

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- trusted server-side (service role) path
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.has_vendor_dashboard_access := false;
    NEW.activated_at := NULL;
    RETURN NEW;
  END IF;

  NEW.has_vendor_dashboard_access := OLD.has_vendor_dashboard_access;

  IF NEW.activated_at IS DISTINCT FROM OLD.activated_at
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role::text = 'superuser'
     ) THEN
    NEW.activated_at := OLD.activated_at;
  END IF;

  RETURN NEW;
END;
$function$;