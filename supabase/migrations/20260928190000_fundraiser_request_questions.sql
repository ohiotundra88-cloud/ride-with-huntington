-- Fundraiser approval request: new questions, raffles, and a Marketing bypass
-- when no Huntington or Pelotonia logos are used (Chris Kemper, 2026-09-28).
-- Safe to re-run.

-- New answers (NULL = request filed before these questions existed).
ALTER TABLE public.fundraiser_requests
  ADD COLUMN IF NOT EXISTS on_huntington_property boolean,
  ADD COLUMN IF NOT EXISTS facilities_approved boolean,
  ADD COLUMN IF NOT EXISTS serves_alcohol boolean,
  ADD COLUMN IF NOT EXISTS alcohol_details text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS serves_food boolean,
  ADD COLUMN IF NOT EXISTS food_policy_acknowledged boolean,
  ADD COLUMN IF NOT EXISTS uses_logos boolean,
  ADD COLUMN IF NOT EXISTS contract_needed boolean,
  ADD COLUMN IF NOT EXISTS liability_waiver_needed boolean;

-- Raffles are their own event type (listed under "Active raffles", never on the calendar).
ALTER TABLE public.fundraiser_requests DROP CONSTRAINT IF EXISTS fundraiser_requests_event_type_chk;
ALTER TABLE public.fundraiser_requests
  ADD CONSTRAINT fundraiser_requests_event_type_chk CHECK (event_type IN ('in_person', 'virtual', 'raffle'));

-- A stage can be "not_required" (Marketing, when no logos are used).
-- The guard now also covers INSERT: a request always starts at the beginning
-- of the approval flow, whoever files it.
CREATE OR REPLACE FUNCTION public.fundraiser_requests_guard_protected()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _fresh_marketing text := CASE WHEN NEW.uses_logos IS FALSE THEN 'not_required' ELSE 'pending' END;
  _is_fresh boolean;
BEGIN
  IF public.is_trusted_writer() THEN
    RETURN NEW;
  END IF;

  _is_fresh :=
        NEW.status = 'submitted'
    AND NEW.captain_status = 'pending'
    AND NEW.legal_status = 'pending'
    AND NEW.risk_status = 'pending'
    AND NEW.compliance_status = 'pending'
    AND NEW.marketing_status = _fresh_marketing
    AND NEW.cochair_status = 'pending';

  IF TG_OP = 'INSERT' THEN
    IF NOT _is_fresh THEN
      RAISE EXCEPTION 'New requests start at the beginning of the approval flow.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
     OR NEW.captain_id IS DISTINCT FROM OLD.captain_id THEN
    RAISE EXCEPTION 'Submitter and captain can only be changed through the Hub.' USING ERRCODE = '42501';
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.captain_status IS DISTINCT FROM OLD.captain_status
      OR NEW.legal_status IS DISTINCT FROM OLD.legal_status
      OR NEW.risk_status IS DISTINCT FROM OLD.risk_status
      OR NEW.compliance_status IS DISTINCT FROM OLD.compliance_status
      OR NEW.marketing_status IS DISTINCT FROM OLD.marketing_status
      OR NEW.cochair_status IS DISTINCT FROM OLD.cochair_status
      OR NEW.uses_logos IS DISTINCT FROM OLD.uses_logos)
     AND NOT _is_fresh THEN
    -- The only status change a submitter may make is resubmitting, which
    -- restarts every stage (changing the logo answer counts as resubmitting).
    RAISE EXCEPTION 'Approval decisions can only be recorded by the assigned reviewers.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fundraiser_requests_guard_protected ON public.fundraiser_requests;
CREATE TRIGGER trg_fundraiser_requests_guard_protected
  BEFORE INSERT OR UPDATE ON public.fundraiser_requests
  FOR EACH ROW EXECUTE FUNCTION public.fundraiser_requests_guard_protected();

-- Participation choices: "Both" becomes "Challenger" in any saved copy of the
-- registration wording (the app's built-in default already changed).
UPDATE public.register_content
SET content = jsonb_set(
  content,
  '{lists,participation}',
  (
    SELECT jsonb_agg(
      CASE WHEN item ->> 'value' = 'both'
        THEN jsonb_build_object(
          'value', 'challenger',
          'label', 'Challenger',
          'desc', 'I''ll take on my own Pelotonia challenge and fundraise, without riding a route.')
        ELSE item END
      ORDER BY ord)
    FROM jsonb_array_elements(content -> 'lists' -> 'participation') WITH ORDINALITY AS t(item, ord)
  )
)
WHERE jsonb_typeof(content -> 'lists' -> 'participation') = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(content -> 'lists' -> 'participation') AS e(item)
    WHERE item ->> 'value' = 'both'
  );
