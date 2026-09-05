CREATE TABLE public.register_content (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.register_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.register_content TO authenticated;
GRANT ALL ON public.register_content TO service_role;

ALTER TABLE public.register_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "register_content_public_select"
  ON public.register_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "register_content_admin_insert"
  ON public.register_content FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE POLICY "register_content_admin_update"
  ON public.register_content FOR UPDATE
  TO authenticated
  USING (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()))
  WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE TRIGGER trg_register_content_updated_at
  BEFORE UPDATE ON public.register_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.register_content (id, content) VALUES (1, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;