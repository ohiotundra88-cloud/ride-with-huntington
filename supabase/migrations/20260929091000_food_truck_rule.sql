-- Food trucks can't be hosted on Huntington Bank property (Chris Kemper, 2026-09-28).
-- The request form asks about a food truck whenever food is served; the Hub
-- blocks the combination, and this constraint keeps it out of the database too.
-- NULL = not asked (no food, or filed before the question existed).
ALTER TABLE public.fundraiser_requests
  ADD COLUMN IF NOT EXISTS food_truck boolean;

ALTER TABLE public.fundraiser_requests DROP CONSTRAINT IF EXISTS fundraiser_requests_no_food_truck_on_property_chk;
ALTER TABLE public.fundraiser_requests
  ADD CONSTRAINT fundraiser_requests_no_food_truck_on_property_chk
  CHECK (NOT (coalesce(on_huntington_property, false) AND coalesce(serves_food, false) AND coalesce(food_truck, false)));
