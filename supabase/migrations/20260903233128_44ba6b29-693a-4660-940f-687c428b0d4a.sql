CREATE OR REPLACE FUNCTION public.can_manage_team_events(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role::text IN ('captain','cochair','superuser','admin'))
  END;
$$;

CREATE TABLE public.team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  start_time text,
  end_time text,
  location text,
  organizer_name text NOT NULL DEFAULT '',
  organizer_email text NOT NULL DEFAULT '',
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  invited_count integer NOT NULL DEFAULT 0,
  flier_path text,
  flier_name text,
  flier_content_type text,
  published_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid NOT NULL,
  created_by_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_events TO authenticated;
GRANT ALL ON public.team_events TO service_role;
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_event_invitees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  rsvp text,
  responded_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_event_invitees TO authenticated;
GRANT ALL ON public.team_event_invitees TO service_role;
ALTER TABLE public.team_event_invitees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_event_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.team_event_audit TO authenticated;
GRANT ALL ON public.team_event_audit TO service_role;
ALTER TABLE public.team_event_audit ENABLE ROW LEVEL SECURITY;

-- Organizers (captain/cochair/admin/superuser) manage events; invitees may read theirs.
CREATE POLICY "Organizers read team events" ON public.team_events
  FOR SELECT TO authenticated
  USING (public.can_manage_team_events(auth.uid()));

CREATE POLICY "Invitees read their team events" ON public.team_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.team_event_invitees i
    WHERE i.event_id = team_events.id AND i.user_id = auth.uid()
  ));

CREATE POLICY "Organizers create team events" ON public.team_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_team_events(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Organizers update team events" ON public.team_events
  FOR UPDATE TO authenticated
  USING (public.can_manage_team_events(auth.uid()))
  WITH CHECK (public.can_manage_team_events(auth.uid()));

CREATE POLICY "Super users delete team events" ON public.team_events
  FOR DELETE TO authenticated
  USING (public.is_superuser(auth.uid()));

CREATE POLICY "Organizers read invitees" ON public.team_event_invitees
  FOR SELECT TO authenticated
  USING (public.can_manage_team_events(auth.uid()));

CREATE POLICY "Invitees read their own invite" ON public.team_event_invitees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organizers add invitees" ON public.team_event_invitees
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_team_events(auth.uid()));

CREATE POLICY "Invitees update their own rsvp" ON public.team_event_invitees
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organizers update invitees" ON public.team_event_invitees
  FOR UPDATE TO authenticated
  USING (public.can_manage_team_events(auth.uid()))
  WITH CHECK (public.can_manage_team_events(auth.uid()));

CREATE POLICY "Super users delete invitees" ON public.team_event_invitees
  FOR DELETE TO authenticated
  USING (public.is_superuser(auth.uid()));

CREATE POLICY "Organizers read team event audit" ON public.team_event_audit
  FOR SELECT TO authenticated
  USING (public.can_manage_team_events(auth.uid()));

CREATE POLICY "Organizers write team event audit" ON public.team_event_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_team_events(auth.uid()));

CREATE TRIGGER trg_team_events_updated_at
  BEFORE UPDATE ON public.team_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_team_event_invitees_user ON public.team_event_invitees(user_id);
CREATE INDEX idx_team_event_invitees_event ON public.team_event_invitees(event_id);
CREATE INDEX idx_team_events_date ON public.team_events(event_date);