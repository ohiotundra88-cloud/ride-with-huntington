ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'captain';

CREATE OR REPLACE FUNCTION public.can_manage_events(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('captain', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_text(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'admin'
  );
$$;

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  start_time text,
  end_time text,
  location text,
  contact_name text,
  contact_email text,
  contact_phone text,
  flier_url text,
  flier_path text,
  flier_name text,
  published boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX events_event_date_idx ON public.events (event_date);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_public_select ON public.events
  FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY events_owner_select ON public.events
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY events_admin_select ON public.events
  FOR SELECT TO authenticated
  USING (public.is_admin_text(auth.uid()));

CREATE POLICY events_manager_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_events(auth.uid()) AND created_by = auth.uid());

CREATE POLICY events_owner_update ON public.events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND public.can_manage_events(auth.uid()))
  WITH CHECK (created_by = auth.uid());

CREATE POLICY events_admin_update ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_admin_text(auth.uid()))
  WITH CHECK (public.is_admin_text(auth.uid()));

CREATE POLICY events_owner_delete ON public.events
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND public.can_manage_events(auth.uid()));

CREATE POLICY events_admin_delete ON public.events
  FOR DELETE TO authenticated
  USING (public.is_admin_text(auth.uid()));

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();