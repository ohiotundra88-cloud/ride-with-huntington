CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Trusted server-side (service role) writes are allowed through untouched.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.has_vendor_dashboard_access := false;
    NEW.activated_at := NULL;
    NEW.password_set_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.has_vendor_dashboard_access IS DISTINCT FROM OLD.has_vendor_dashboard_access THEN
    NEW.has_vendor_dashboard_access := OLD.has_vendor_dashboard_access;
  END IF;

  IF NEW.activated_at IS DISTINCT FROM OLD.activated_at
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid() AND ur.role::text = 'superuser'
     ) THEN
    NEW.activated_at := OLD.activated_at;
  END IF;

  IF NEW.password_set_at IS DISTINCT FROM OLD.password_set_at
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid() AND ur.role::text = 'superuser'
     ) THEN
    NEW.password_set_at := OLD.password_set_at;
  END IF;

  RETURN NEW;
END;
$function$;