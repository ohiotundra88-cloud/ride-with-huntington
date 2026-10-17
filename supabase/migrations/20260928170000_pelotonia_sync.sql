-- Local copy of Team Huntington's public Pelotonia data, refreshed nightly by
-- jobs/pelotonia-sync. Everything here is what my.pelotonia.org shows publicly.
-- Signed-in Hub members can read it; only the sync job (service role) writes.

CREATE TABLE IF NOT EXISTS public.pelotonia_pelotons (
  id text PRIMARY KEY,
  parent_id text REFERENCES public.pelotonia_pelotons(id) ON DELETE SET NULL,
  name text NOT NULL,
  short_name text NOT NULL,
  level text,
  current_event text,
  members_count integer NOT NULL DEFAULT 0,
  raised numeric(14,2) NOT NULL DEFAULT 0,
  goal numeric(14,2) NOT NULL DEFAULT 0,
  all_time_raised numeric(14,2) NOT NULL DEFAULT 0,
  general_peloton_funds numeric(14,2) NOT NULL DEFAULT 0,
  raised_by_members numeric(14,2) NOT NULL DEFAULT 0,
  captain_name text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pelotonia_riders (
  public_id text PRIMARY KEY,
  peloton_id text REFERENCES public.pelotonia_pelotons(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  first_name text,
  last_name text,
  is_captain boolean NOT NULL DEFAULT false,
  is_peloton_admin boolean NOT NULL DEFAULT false,
  is_rider boolean NOT NULL DEFAULT false,
  is_volunteer boolean NOT NULL DEFAULT false,
  is_challenger boolean NOT NULL DEFAULT false,
  is_survivor boolean NOT NULL DEFAULT false,
  is_researcher boolean NOT NULL DEFAULT false,
  is_high_roller boolean NOT NULL DEFAULT false,
  registration_types text[] NOT NULL DEFAULT '{}',
  ride_types text[] NOT NULL DEFAULT '{}',
  route_ids text[] NOT NULL DEFAULT '{}',
  route_names text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  raised numeric(12,2) NOT NULL DEFAULT 0,
  goal numeric(12,2) NOT NULL DEFAULT 0,
  commitment numeric(12,2) NOT NULL DEFAULT 0,
  all_time_raised numeric(12,2) NOT NULL DEFAULT 0,
  profile_image_url text,
  current_event text,
  list_synced_at timestamptz NOT NULL DEFAULT now(),
  profile_synced_at timestamptz,
  raw_profile jsonb
);
CREATE INDEX IF NOT EXISTS pelotonia_riders_peloton_idx ON public.pelotonia_riders (peloton_id);
CREATE INDEX IF NOT EXISTS pelotonia_riders_raised_idx ON public.pelotonia_riders (raised DESC);

CREATE TABLE IF NOT EXISTS public.pelotonia_rides (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text,
  is_signature boolean NOT NULL DEFAULT false,
  status text,
  registration_start timestamptz,
  registration_end timestamptz,
  volunteer_registration_start timestamptz,
  volunteer_registration_end timestamptz,
  weekend_start timestamptz,
  weekend_end timestamptz,
  withdraw_deadline timestamptz,
  lower_distance_deadline timestamptz,
  registration_fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pelotonia_routes (
  id text PRIMARY KEY,
  ride_id text REFERENCES public.pelotonia_rides(id) ON DELETE SET NULL,
  name text NOT NULL,
  distance numeric,
  duration text,
  difficulty text,
  start_date timestamptz,
  fundraising_commitment numeric(12,2),
  capacity integer,
  registration_count integer,
  highest_incline numeric,
  description text,
  map_url text,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- One row per sync run: builds a daily fundraising history over time.
CREATE TABLE IF NOT EXISTS public.pelotonia_team_snapshots (
  snapshot_date date PRIMARY KEY,
  raised numeric(14,2) NOT NULL,
  goal numeric(14,2) NOT NULL,
  members_count integer NOT NULL,
  riders integer NOT NULL DEFAULT 0,
  volunteers integer NOT NULL DEFAULT 0,
  challengers integer NOT NULL DEFAULT 0,
  high_rollers integer NOT NULL DEFAULT 0,
  survivors integer NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pelotonia_sync_runs (
  id bigserial PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  pelotons integer NOT NULL DEFAULT 0,
  riders_listed integer NOT NULL DEFAULT 0,
  profiles_fetched integer NOT NULL DEFAULT 0,
  requests integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  note text
);

-- Team-wide counts the Team page shows (from the synced profiles).
CREATE OR REPLACE VIEW public.pelotonia_team_stats
WITH (security_invoker = true) AS
SELECT
  count(*)::int AS members,
  count(*) FILTER (WHERE is_rider)::int AS riders,
  count(*) FILTER (WHERE is_volunteer)::int AS volunteers,
  count(*) FILTER (WHERE is_challenger)::int AS challengers,
  count(*) FILTER (WHERE is_high_roller)::int AS high_rollers,
  count(*) FILTER (WHERE is_survivor)::int AS survivors,
  coalesce(sum(commitment), 0)::numeric(14,2) AS total_committed,
  count(*) FILTER (WHERE profile_synced_at IS NOT NULL)::int AS profiles_synced,
  max(profile_synced_at) AS last_profile_sync
FROM public.pelotonia_riders;

CREATE OR REPLACE VIEW public.pelotonia_subteam_stats
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.short_name AS name,
  p.members_count,
  p.raised,
  count(r.*) FILTER (WHERE r.is_rider)::int AS riders,
  count(r.*) FILTER (WHERE r.is_volunteer)::int AS volunteers,
  count(r.*) FILTER (WHERE r.is_challenger)::int AS challengers,
  count(r.*) FILTER (WHERE r.is_high_roller)::int AS high_rollers,
  count(r.*) FILTER (WHERE r.is_survivor)::int AS survivors,
  coalesce(sum(r.commitment), 0)::numeric(14,2) AS committed
FROM public.pelotonia_pelotons p
LEFT JOIN public.pelotonia_riders r ON r.peloton_id = p.id
WHERE p.parent_id IS NOT NULL
GROUP BY p.id;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pelotonia_pelotons','pelotonia_riders','pelotonia_rides','pelotonia_routes','pelotonia_team_snapshots','pelotonia_sync_runs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "Hub members read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Hub members read" ON public.%I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.pelotonia_sync_runs_id_seq TO service_role;
REVOKE ALL ON public.pelotonia_team_stats, public.pelotonia_subteam_stats FROM anon;
GRANT SELECT ON public.pelotonia_team_stats, public.pelotonia_subteam_stats TO authenticated, service_role;
