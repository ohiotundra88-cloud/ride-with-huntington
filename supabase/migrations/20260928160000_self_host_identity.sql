-- Self-hosted Hub: sign-in comes from an external OpenID Connect provider
-- (Aspire Identity today, Microsoft Entra ID later) instead of Supabase Auth.
-- auth.users stays the anchor every table references; the app maps the
-- provider's subject to a row here on each sign-in. Safe to re-run.

-- Which non-Huntington addresses may hold an account (e.g. the Hub's builders).
CREATE TABLE IF NOT EXISTS public.hub_email_allowlist (
  email text PRIMARY KEY CHECK (email = lower(email)),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hub_email_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_email_allowlist FROM anon, authenticated;

-- People who are made Hub super users + admins the first time they sign in.
CREATE TABLE IF NOT EXISTS public.hub_bootstrap_admins (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hub_bootstrap_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_bootstrap_admins FROM anon, authenticated;

INSERT INTO public.hub_email_allowlist (email, note) VALUES
  ('topher.otten@gmail.com', 'Hub builder (Aspire Digital)')
ON CONFLICT (email) DO NOTHING;
INSERT INTO public.hub_bootstrap_admins (email) VALUES
  ('christopher.kemper@huntington.com'),
  ('topher.otten@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Huntington-only rule, now with the explicit allowlist above.
CREATE OR REPLACE FUNCTION public.enforce_huntington_auth_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email THEN
    IF COALESCE(NEW.email, '') !~* '^[^@[:space:]]+@huntington[.]com$'
       AND NOT EXISTS (SELECT 1 FROM public.hub_email_allowlist a WHERE a.email = lower(NEW.email)) THEN
      RAISE EXCEPTION 'Only @huntington.com addresses are accepted.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_huntington_auth_email() FROM PUBLIC, anon, authenticated;

-- The original bootstrap granted admin to a misspelled address; replace it
-- with the table-driven version.
CREATE OR REPLACE FUNCTION public.grant_admin_for_kemper()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.hub_bootstrap_admins b WHERE b.email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'), (NEW.id, 'superuser')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- Provider subject -> Hub user. Accounts pre-created by an admin (roster add)
-- have no subject yet and are claimed by email on first sign-in.
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS identity_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS users_identity_subject_key ON auth.users (identity_subject)
  WHERE identity_subject IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON auth.users (lower(email));

CREATE OR REPLACE FUNCTION public.hub_sign_in(p_subject text, p_email text, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  _email text := lower(trim(p_email));
  _id uuid;
BEGIN
  IF coalesce(p_subject, '') = '' OR _email = '' THEN
    RAISE EXCEPTION 'subject and email are required' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO _id FROM auth.users WHERE identity_subject = p_subject;
  IF _id IS NULL THEN
    SELECT id INTO _id FROM auth.users WHERE lower(email) = _email AND identity_subject IS NULL;
    IF _id IS NOT NULL THEN
      UPDATE auth.users SET identity_subject = p_subject WHERE id = _id;
    END IF;
  END IF;

  IF _id IS NULL THEN
    INSERT INTO auth.users (email, identity_subject, email_confirmed_at, raw_user_meta_data)
    VALUES (_email, p_subject, now(), jsonb_build_object('full_name', coalesce(p_name, '')))
    RETURNING id INTO _id;
  ELSE
    UPDATE auth.users
       SET email = _email,
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           last_sign_in_at = now(),
           updated_at = now()
     WHERE id = _id;
  END IF;

  UPDATE public.profiles
     SET activated_at = coalesce(activated_at, now()),
         full_name = coalesce(nullif(full_name, ''), nullif(p_name, ''))
   WHERE id = _id;
  RETURN _id;
END;
$$;

-- Admin-side account management (replaces the Supabase Auth admin API).
CREATE OR REPLACE FUNCTION public.hub_create_user(p_email text, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM auth.users WHERE lower(email) = lower(trim(p_email));
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  INSERT INTO auth.users (email, email_confirmed_at, raw_user_meta_data)
  VALUES (lower(trim(p_email)), now(), jsonb_build_object('full_name', coalesce(p_name, '')))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hub_delete_user(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  DELETE FROM auth.users WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.hub_list_users()
RETURNS TABLE (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, u.raw_user_meta_data ->> 'full_name'
  FROM auth.users u ORDER BY u.created_at;
$$;

REVOKE ALL ON FUNCTION public.hub_sign_in(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_create_user(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_delete_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_list_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hub_sign_in(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hub_create_user(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hub_delete_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.hub_list_users() TO service_role;
