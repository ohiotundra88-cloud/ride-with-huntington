-- Security hardening, September 2026 review.
-- Safe to run more than once. Every change narrows what signed-in users can
-- write directly; the app's server functions (service role) are unaffected.

-- 0. Schema drift -----------------------------------------------------------
-- Production has fundraiser_requests.captain_id (used by the app since
-- 2026-09-17) but no migration created it. Recorded here so the repo rebuilds
-- the real schema; a no-op where the column already exists.
ALTER TABLE public.fundraiser_requests
  ADD COLUMN IF NOT EXISTS captain_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 1. Profile email always mirrors the sign-in account ------------------------
-- A user could previously set their profile email to a colleague's address
-- and receive roles later granted "to that email".
REVOKE UPDATE (email) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.profiles_force_auth_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _auth_email text;
BEGIN
  SELECT lower(u.email) INTO _auth_email FROM auth.users u WHERE u.id = NEW.id;
  IF _auth_email IS NOT NULL THEN
    NEW.email := _auth_email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_force_auth_email ON public.profiles;
CREATE TRIGGER trg_profiles_force_auth_email
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_force_auth_email();

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles SET email = lower(NEW.email) WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email_from_auth ON auth.users;
CREATE TRIGGER trg_sync_profile_email_from_auth
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- Repair any profile whose email drifted from its sign-in account.
UPDATE public.profiles p
SET email = lower(u.email)
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM lower(u.email);

-- 2. Profile photo columns are written by the server only --------------------
-- Users could set avatar_content_type to text/html and serve a web page from
-- the app's own domain.
REVOKE UPDATE (avatar_path, avatar_content_type, avatar_updated_at) ON public.profiles FROM authenticated;

UPDATE public.profiles
SET avatar_path = NULL, avatar_content_type = NULL, avatar_updated_at = NULL
WHERE avatar_content_type IS NOT NULL
  AND avatar_content_type NOT IN ('image/png', 'image/jpeg', 'image/webp');

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'avatars';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
WHERE id = 'event-fliers';

-- 3. Approval fields change only through the server --------------------------
-- The row policies let an organizer set status = 'live' (or approve their own
-- request) straight from the browser, skipping Legal/Risk/Compliance.
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT current_user IN ('postgres', 'service_role', 'supabase_admin')
      OR coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.fundraisers_guard_protected()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_writer() THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.published_at IS DISTINCT FROM OLD.published_at
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
     OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
     OR NEW.hidden_by IS DISTINCT FROM OLD.hidden_by
     OR NEW.public_hidden IS DISTINCT FROM OLD.public_hidden
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.organizer_id IS DISTINCT FROM OLD.organizer_id
     OR NEW.is_demo IS DISTINCT FROM OLD.is_demo
     OR NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Status, approval and publishing fields can only be changed through the Hub''s approval flow.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fundraisers_guard_protected ON public.fundraisers;
CREATE TRIGGER trg_fundraisers_guard_protected
  BEFORE UPDATE ON public.fundraisers
  FOR EACH ROW EXECUTE FUNCTION public.fundraisers_guard_protected();

CREATE OR REPLACE FUNCTION public.fundraiser_requests_guard_protected()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _statuses_changed boolean;
  _is_resubmission boolean;
BEGIN
  IF public.is_trusted_writer() THEN
    RETURN NEW;
  END IF;
  IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
     OR NEW.captain_id IS DISTINCT FROM OLD.captain_id THEN
    RAISE EXCEPTION 'Submitter and captain can only be changed through the Hub.'
      USING ERRCODE = '42501';
  END IF;
  _statuses_changed :=
       NEW.status IS DISTINCT FROM OLD.status
    OR NEW.captain_status IS DISTINCT FROM OLD.captain_status
    OR NEW.legal_status IS DISTINCT FROM OLD.legal_status
    OR NEW.risk_status IS DISTINCT FROM OLD.risk_status
    OR NEW.compliance_status IS DISTINCT FROM OLD.compliance_status
    OR NEW.marketing_status IS DISTINCT FROM OLD.marketing_status
    OR NEW.cochair_status IS DISTINCT FROM OLD.cochair_status;
  -- The one status change a submitter may make: resubmitting after edits,
  -- which resets every approval stage to pending.
  _is_resubmission :=
        NEW.status = 'submitted'
    AND NEW.captain_status = 'pending'
    AND NEW.legal_status = 'pending'
    AND NEW.risk_status = 'pending'
    AND NEW.compliance_status = 'pending'
    AND NEW.marketing_status = 'pending'
    AND NEW.cochair_status = 'pending';
  IF _statuses_changed AND NOT _is_resubmission THEN
    RAISE EXCEPTION 'Approval decisions can only be recorded by the assigned reviewers.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fundraiser_requests_guard_protected ON public.fundraiser_requests;
CREATE TRIGGER trg_fundraiser_requests_guard_protected
  BEFORE UPDATE ON public.fundraiser_requests
  FOR EACH ROW EXECUTE FUNCTION public.fundraiser_requests_guard_protected();

-- 4. Recipients can only mark their own row read / RSVP ----------------------
REVOKE UPDATE ON public.message_recipients FROM authenticated;
GRANT UPDATE (read_at, dismissed_at) ON public.message_recipients TO authenticated;

REVOKE UPDATE ON public.team_event_invitees FROM authenticated;
GRANT UPDATE (rsvp, responded_at) ON public.team_event_invitees TO authenticated;
