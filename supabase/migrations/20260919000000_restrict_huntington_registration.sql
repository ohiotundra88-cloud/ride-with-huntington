-- Creation hook gives callers a useful error even through the direct Auth API.
CREATE OR REPLACE FUNCTION public.before_huntington_user_created(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF COALESCE(event->'user'->>'email', '') !~* '^[^@[:space:]]+@huntington[.]com$' THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 400, 'message', 'Only @huntington.com addresses are accepted.'));
  END IF;
  RETURN '{}'::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.before_huntington_user_created(jsonb) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.before_huntington_user_created(jsonb) TO supabase_auth_admin;

-- Defense in depth: also prevent changing an account to an outside address.
-- Existing users are not deleted or rewritten. Unrelated updates remain allowed.
CREATE OR REPLACE FUNCTION public.enforce_huntington_auth_email()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.email IS DISTINCT FROM OLD.email THEN
    IF COALESCE(NEW.email, '') !~* '^[^@[:space:]]+@huntington[.]com$' THEN
      RAISE EXCEPTION 'Only @huntington.com addresses are accepted.' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.email_change IS DISTINCT FROM OLD.email_change THEN
    IF COALESCE(NEW.email_change, '') <> '' AND
       NEW.email_change !~* '^[^@[:space:]]+@huntington[.]com$' THEN
      RAISE EXCEPTION 'Only @huntington.com addresses are accepted.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_huntington_auth_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_huntington_auth_email
BEFORE INSERT OR UPDATE OF email, email_change ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_huntington_auth_email();
