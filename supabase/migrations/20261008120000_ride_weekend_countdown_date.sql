ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ride_weekend_date timestamptz NOT NULL
  DEFAULT '2027-08-07T04:00:00Z';

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.site_settings'::regclass
      AND conname = 'site_settings_ride_weekend_date_columbus_midnight'
  ) THEN
    ALTER TABLE public.site_settings
      ADD CONSTRAINT site_settings_ride_weekend_date_columbus_midnight
      CHECK (
        (ride_weekend_date AT TIME ZONE 'America/New_York')::time = time '00:00:00'
      );
  END IF;
END;
$constraint$;

CREATE OR REPLACE FUNCTION public.set_ride_weekend_date(_date timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_date timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Only admins and super users can change the Ride Weekend countdown date.';
  END IF;

  IF _date IS NULL OR (_date AT TIME ZONE 'America/New_York')::time <> time '00:00:00' THEN
    RAISE EXCEPTION 'Ride Weekend countdown dates must be midnight in Columbus.';
  END IF;

  UPDATE public.site_settings
  SET ride_weekend_date = _date,
      updated_by = auth.uid()
  WHERE id = 1
  RETURNING ride_weekend_date INTO saved_date;

  IF saved_date IS NULL THEN
    RAISE EXCEPTION 'Site settings row not found.';
  END IF;

  RETURN saved_date;
END;
$$;

REVOKE ALL ON FUNCTION public.set_ride_weekend_date(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ride_weekend_date(timestamptz) TO authenticated;
