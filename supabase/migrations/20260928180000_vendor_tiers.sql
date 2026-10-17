-- Vendor CRM: sponsorship tiers (Chris Kemper's wish list, 2026-09-28).
--   * Pelotonia Kids donations per vendor per year, counted toward the tier.
--   * Sponsored rider slots that come with the top two tiers
--     (Pinnacle Partner: 5 with hotel; One Goal: 2 without).
-- Tiers themselves are computed in the app from each year's totals
-- (src/lib/vendors.shared.ts), so thresholds live in one place.

ALTER TABLE public.vendor_donations
  ADD COLUMN IF NOT EXISTS kids_amount numeric(12,2) NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE public.vendor_donations
    ADD CONSTRAINT vendor_donations_kids_amount_chk CHECK (kids_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vendor_rider_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 9999),
  slot_number integer NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
  rider_name text NOT NULL DEFAULT '',
  pelotonia_id text NOT NULL DEFAULT '',
  bike_needed boolean NOT NULL DEFAULT false,
  bike_size text NOT NULL DEFAULT '',
  hotel_needed boolean NOT NULL DEFAULT false,
  hotel_check_in date,
  hotel_check_out date,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, year, slot_number),
  CHECK (hotel_check_out IS NULL OR hotel_check_in IS NULL OR hotel_check_out >= hotel_check_in)
);
CREATE INDEX IF NOT EXISTS vendor_rider_slots_vendor_idx ON public.vendor_rider_slots (vendor_id, year);

ALTER TABLE public.vendor_rider_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_rider_slots FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_rider_slots TO authenticated;
GRANT ALL ON public.vendor_rider_slots TO service_role;
DROP POLICY IF EXISTS vendor_rider_slots_all ON public.vendor_rider_slots;
CREATE POLICY vendor_rider_slots_all ON public.vendor_rider_slots
  FOR ALL TO authenticated
  USING (public.can_view_vendors(auth.uid()))
  WITH CHECK (public.can_view_vendors(auth.uid()));

DROP TRIGGER IF EXISTS set_vendor_rider_slots_updated_at ON public.vendor_rider_slots;
CREATE TRIGGER set_vendor_rider_slots_updated_at
  BEFORE UPDATE ON public.vendor_rider_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
