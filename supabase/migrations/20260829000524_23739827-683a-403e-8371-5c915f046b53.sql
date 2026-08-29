-- 1) Role helpers: run as the caller (SECURITY INVOKER) instead of elevated.
--    Each helper is already self-scoped (returns false when asked about
--    another user), and user_roles/profiles both expose the caller's own row
--    to `authenticated`, so behaviour is unchanged.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_text(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'admin')
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_superuser(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'superuser')
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_leadership(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id
        AND role::text IN ('admin','superuser','captain','legal','risk','compliance','marketing','cochair'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_fundraiser_reviewer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id
        AND role::text IN ('admin','superuser','captain','legal','risk','compliance','marketing','cochair'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_events(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('captain','admin'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_archive_vendors(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('superuser','cochair'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_purge_vendors(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'superuser')
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_vendors(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('superuser','cochair'))
      OR (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'vendor_captain')
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.has_vendor_dashboard_access)
      )
    )
  END;
$$;

-- 2) Profiles: block self-service escalation of has_vendor_dashboard_access.
--    Super users change the flag through the admin screen, which runs with the
--    service role (auth.uid() IS NULL) and is therefore still allowed.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- trusted server-side (service role) path
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.has_vendor_dashboard_access := false;
    RETURN NEW;
  END IF;

  NEW.has_vendor_dashboard_access := OLD.has_vendor_dashboard_access;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_protect_privileged
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();