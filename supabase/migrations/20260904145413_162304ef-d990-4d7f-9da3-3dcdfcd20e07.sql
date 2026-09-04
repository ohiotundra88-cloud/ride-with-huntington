ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

CREATE TABLE IF NOT EXISTS public.signin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_key text NOT NULL,
  failures integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS signin_attempts_email_key_uidx ON public.signin_attempts (email_key);

GRANT ALL ON public.signin_attempts TO service_role;

ALTER TABLE public.signin_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.signin_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_signin_attempts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS update_signin_attempts_updated_at ON public.signin_attempts;
CREATE TRIGGER update_signin_attempts_updated_at
BEFORE UPDATE ON public.signin_attempts
FOR EACH ROW EXECUTE FUNCTION public.touch_signin_attempts_updated_at();