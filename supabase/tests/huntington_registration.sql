-- Run after migrations with psql -v ON_ERROR_STOP=1 -f this-file.sql.
-- Uses a temporary table; does not create real accounts or send email.
BEGIN;
CREATE TEMP TABLE huntington_email_test (email text, email_change text);
CREATE TRIGGER huntington_email_test_guard
BEFORE INSERT OR UPDATE OF email, email_change ON huntington_email_test
FOR EACH ROW EXECUTE FUNCTION public.enforce_huntington_auth_email();
DO $$
DECLARE address text;
BEGIN
  FOREACH address IN ARRAY ARRAY['a@huntington.com', 'A@HUNTINGTON.COM', 'a+ride@huntington.com'] LOOP
    IF public.before_huntington_user_created(jsonb_build_object('user', jsonb_build_object('email', address))) <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Allowed address rejected: %', address;
    END IF;
    INSERT INTO huntington_email_test VALUES (address, '');
  END LOOP;
  FOREACH address IN ARRAY ARRAY[NULL, '', '@huntington.com', 'a@gmail.com', 'a@@huntington.com', 'a@sub.huntington.com', 'a@huntington.com.evil.test', 'a b@huntington.com'] LOOP
    IF NOT (public.before_huntington_user_created(jsonb_build_object('user', jsonb_build_object('email', address))) ? 'error') THEN
      RAISE EXCEPTION 'Disallowed address accepted by hook: %', address;
    END IF;
    BEGIN
      INSERT INTO huntington_email_test VALUES (address, '');
      RAISE EXCEPTION 'Disallowed insert succeeded: %', address;
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END LOOP;
  BEGIN
    UPDATE huntington_email_test SET email = 'a@gmail.com';
    RAISE EXCEPTION 'Outside email update succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE huntington_email_test SET email_change = 'a@gmail.com';
    RAISE EXCEPTION 'Outside email change request succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE huntington_email_test SET email_change = 'new@huntington.com';
  UPDATE huntington_email_test SET email_change = '';
END;
$$;
ROLLBACK;
