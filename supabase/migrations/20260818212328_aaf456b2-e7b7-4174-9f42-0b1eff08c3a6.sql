CREATE TABLE public.site_branding (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_path text,
  hero_name text,
  hero_content_type text,
  hero_overlay integer NOT NULL DEFAULT 65,
  hero_position text NOT NULL DEFAULT 'center',
  logo_path text,
  logo_name text,
  logo_content_type text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.site_branding TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_branding TO authenticated;
GRANT ALL ON public.site_branding TO service_role;

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_branding_public_select ON public.site_branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY site_branding_admin_insert ON public.site_branding FOR INSERT TO authenticated WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));
CREATE POLICY site_branding_admin_update ON public.site_branding FOR UPDATE TO authenticated USING (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid())) WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE TRIGGER trg_site_branding_updated_at BEFORE UPDATE ON public.site_branding FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_branding (id) VALUES (1) ON CONFLICT (id) DO NOTHING;