-- Site-wide configuration tables are single-row (id = 1) by design.
-- Replace the blanket USING (true) SELECT policies with a row-scoped
-- predicate so only that one public configuration row is readable.

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read the site settings row"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (id = 1);

DROP POLICY IF EXISTS "site_branding_public_select" ON public.site_branding;
CREATE POLICY "site_branding_public_select"
  ON public.site_branding
  FOR SELECT
  TO anon, authenticated
  USING (id = 1);

DROP POLICY IF EXISTS "register_content_public_select" ON public.register_content;
CREATE POLICY "register_content_public_select"
  ON public.register_content
  FOR SELECT
  TO anon, authenticated
  USING (id = 1);
