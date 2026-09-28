-- Pelotonia Kids: money raised on PledgeIt for Team Huntington's Kids ride.
-- Pelotonia's own data doesn't include it, so the nightly sync reads the
-- public PledgeIt campaign page and keeps the total here. The Team page adds
-- it to the team total, the same way Pelotonia's team dashboard does.
CREATE TABLE IF NOT EXISTS public.pelotonia_kids_campaigns (
  slug text PRIMARY KEY,
  name text NOT NULL,
  raised numeric(14,2) NOT NULL DEFAULT 0,
  goal numeric(14,2),
  url text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pelotonia_team_snapshots
  ADD COLUMN IF NOT EXISTS kids_raised numeric(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.pelotonia_kids_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pelotonia_kids_campaigns FROM anon, authenticated;
GRANT SELECT ON public.pelotonia_kids_campaigns TO authenticated;
GRANT ALL ON public.pelotonia_kids_campaigns TO service_role;
DROP POLICY IF EXISTS "Hub members read" ON public.pelotonia_kids_campaigns;
CREATE POLICY "Hub members read" ON public.pelotonia_kids_campaigns FOR SELECT TO authenticated USING (true);
