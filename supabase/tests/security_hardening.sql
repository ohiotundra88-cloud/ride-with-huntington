-- Security hardening regression tests (migration 20260928140000).
-- Runs inside one transaction and rolls back: creates no lasting data.
-- Each attack is paired with a control proving the legitimate path still works.
-- Control run: PGOPTIONS='-c test.report_only=on' against a database WITHOUT
-- the migration should print FAIL for every blocked case.
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/security_hardening.sql
BEGIN;

CREATE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    EXECUTE 'SET LOCAL ROLE service_role';
  ELSE
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
  END IF;
END $$;

CREATE FUNCTION pg_temp.expect_denied(_label text, _sql text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS (blocked): %', _label;
    RETURN;
  END;
  IF current_setting('test.report_only', true) = 'on' THEN
    RAISE NOTICE 'FAIL: % was allowed', _label;
  ELSE
    RAISE EXCEPTION 'FAIL: % was allowed', _label;
  END IF;
END $$;

CREATE FUNCTION pg_temp.expect_ok(_label text, _sql text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE _n int;
BEGIN
  EXECUTE _sql;
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RAISE EXCEPTION 'FAIL: % matched no rows', _label; END IF;
  RAISE NOTICE 'PASS (allowed): %', _label;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, service_role;

-- Fixtures (as the migration owner) ------------------------------------------
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'alice.test@huntington.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'bob.test@huntington.com', now());
INSERT INTO public.profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-00000000000a', 'someone.else@huntington.com', 'Alice'),
       ('00000000-0000-0000-0000-00000000000b', 'bob.test@huntington.com', 'Bob')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

DO $$ BEGIN
  IF (SELECT email FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000000a')
     <> 'alice.test@huntington.com' THEN
    IF current_setting('test.report_only', true) = 'on' THEN
      RAISE NOTICE 'FAIL: profile email not forced to the sign-in address';
    ELSE
      RAISE EXCEPTION 'FAIL: profile email not forced to the sign-in address';
    END IF;
  ELSE
    RAISE NOTICE 'PASS: profile email forced to the sign-in address';
  END IF;
END $$;

INSERT INTO public.fundraisers (id, slug, title, organizer_id, status)
VALUES ('00000000-0000-0000-0000-0000000000f1', 'alice-test', 'Alice test fundraiser',
        '00000000-0000-0000-0000-00000000000a', 'draft');
INSERT INTO public.fundraiser_requests (id, title, event_date, submitted_by, status)
VALUES ('00000000-0000-0000-0000-0000000000e1', 'Alice request', current_date,
        '00000000-0000-0000-0000-00000000000a', 'changes_requested');
INSERT INTO public.messages (id, title, created_by)
VALUES ('00000000-0000-0000-0000-0000000000d1', 'Hello', '00000000-0000-0000-0000-00000000000b'),
       ('00000000-0000-0000-0000-0000000000d2', 'Other', '00000000-0000-0000-0000-00000000000b');
INSERT INTO public.message_recipients (message_id, user_id)
VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a');
INSERT INTO public.team_events (id, title, event_date, created_by)
VALUES ('00000000-0000-0000-0000-0000000000c1', 'Kickoff', current_date, '00000000-0000-0000-0000-00000000000b'),
       ('00000000-0000-0000-0000-0000000000c2', 'Other', current_date, '00000000-0000-0000-0000-00000000000b');
INSERT INTO public.team_event_invitees (event_id, user_id)
VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a');

-- Signed in as Alice ----------------------------------------------------------
SELECT pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

SELECT pg_temp.expect_denied('set own profile email to a colleague',
  $q$UPDATE public.profiles SET email = 'bob.test@huntington.com' WHERE id = auth.uid()$q$);
SELECT pg_temp.expect_denied('set avatar content type to text/html',
  $q$UPDATE public.profiles SET avatar_content_type = 'text/html' WHERE id = auth.uid()$q$);
SELECT pg_temp.expect_ok('edit own name and mobile',
  $q$UPDATE public.profiles SET full_name = 'Alice T', mobile = '555-0100' WHERE id = auth.uid()$q$);

SELECT pg_temp.expect_denied('organizer publishes own fundraiser',
  $q$UPDATE public.fundraisers SET status = 'live' WHERE id = '00000000-0000-0000-0000-0000000000f1'$q$);
SELECT pg_temp.expect_denied('organizer un-hides / re-slugs fundraiser',
  $q$UPDATE public.fundraisers SET slug = 'huntington-official' WHERE id = '00000000-0000-0000-0000-0000000000f1'$q$);
SELECT pg_temp.expect_ok('organizer edits fundraiser story',
  $q$UPDATE public.fundraisers SET story = 'Why I ride' WHERE id = '00000000-0000-0000-0000-0000000000f1'$q$);

SELECT pg_temp.expect_denied('submitter approves own Legal stage',
  $q$UPDATE public.fundraiser_requests SET legal_status = 'approved' WHERE id = '00000000-0000-0000-0000-0000000000e1'$q$);
SELECT pg_temp.expect_denied('submitter marks own request approved',
  $q$UPDATE public.fundraiser_requests SET status = 'approved' WHERE id = '00000000-0000-0000-0000-0000000000e1'$q$);
SELECT pg_temp.expect_denied('submitter picks own captain',
  $q$UPDATE public.fundraiser_requests SET captain_id = auth.uid() WHERE id = '00000000-0000-0000-0000-0000000000e1'$q$);
SELECT pg_temp.expect_ok('submitter resubmits after changes (all stages reset)',
  $q$UPDATE public.fundraiser_requests SET title = 'Alice request v2', status = 'submitted',
       captain_status = 'pending', legal_status = 'pending', risk_status = 'pending',
       compliance_status = 'pending', marketing_status = 'pending', cochair_status = 'pending'
     WHERE id = '00000000-0000-0000-0000-0000000000e1'$q$);

SELECT pg_temp.expect_denied('recipient re-points row at another message',
  $q$UPDATE public.message_recipients SET message_id = '00000000-0000-0000-0000-0000000000d2' WHERE user_id = auth.uid()$q$);
SELECT pg_temp.expect_ok('recipient marks message read',
  $q$UPDATE public.message_recipients SET read_at = now() WHERE user_id = auth.uid()$q$);

SELECT pg_temp.expect_denied('invitee moves invite to another event',
  $q$UPDATE public.team_event_invitees SET event_id = '00000000-0000-0000-0000-0000000000c2' WHERE user_id = auth.uid()$q$);
SELECT pg_temp.expect_ok('invitee RSVPs',
  $q$UPDATE public.team_event_invitees SET rsvp = 'yes', responded_at = now() WHERE user_id = auth.uid()$q$);

-- Server (service role) keeps full control ------------------------------------
RESET ROLE;
SELECT pg_temp.act_as(NULL);

SELECT pg_temp.expect_ok('server publishes an approved fundraiser',
  $q$UPDATE public.fundraisers SET status = 'live', published_at = now() WHERE id = '00000000-0000-0000-0000-0000000000f1'$q$);
SELECT pg_temp.expect_ok('server records a reviewer decision',
  $q$UPDATE public.fundraiser_requests SET legal_status = 'approved' WHERE id = '00000000-0000-0000-0000-0000000000e1'$q$);
SELECT pg_temp.expect_ok('server sets a profile photo',
  $q$UPDATE public.profiles SET avatar_path = 'x/avatar.png', avatar_content_type = 'image/png'
     WHERE id = '00000000-0000-0000-0000-00000000000a'$q$);

RESET ROLE;
ROLLBACK;
