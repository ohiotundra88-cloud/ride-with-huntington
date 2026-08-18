CREATE TABLE public.fundraising_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Social graphics',
  suggested_caption text,
  link_url text,
  file_path text,
  file_name text,
  content_type text,
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fundraising_assets TO authenticated;
GRANT SELECT ON public.fundraising_assets TO anon;
GRANT ALL ON public.fundraising_assets TO service_role;

ALTER TABLE public.fundraising_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY fundraising_assets_public_select ON public.fundraising_assets
  FOR SELECT TO anon, authenticated USING (published = true);

CREATE POLICY fundraising_assets_manager_select ON public.fundraising_assets
  FOR SELECT TO authenticated USING (public.can_manage_events(auth.uid()));

CREATE POLICY fundraising_assets_manager_insert ON public.fundraising_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_events(auth.uid()) AND created_by = auth.uid());

CREATE POLICY fundraising_assets_manager_update ON public.fundraising_assets
  FOR UPDATE TO authenticated
  USING (public.can_manage_events(auth.uid()))
  WITH CHECK (public.can_manage_events(auth.uid()));

CREATE POLICY fundraising_assets_manager_delete ON public.fundraising_assets
  FOR DELETE TO authenticated
  USING (public.can_manage_events(auth.uid()));

CREATE TRIGGER trg_fundraising_assets_updated_at
  BEFORE UPDATE ON public.fundraising_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();