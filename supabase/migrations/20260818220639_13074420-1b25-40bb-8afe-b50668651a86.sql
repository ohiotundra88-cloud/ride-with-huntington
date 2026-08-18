-- 1. Events: hide organizer email/phone from anon via column-level privileges
REVOKE SELECT ON public.events FROM anon;
GRANT SELECT (id, title, description, event_date, start_time, end_time, location,
              contact_name, flier_url, flier_path, flier_name, published,
              created_by, created_at, updated_at)
  ON public.events TO anon;

-- 2. Site visits: counter is maintained server-side only
DROP POLICY IF EXISTS site_visits_public_select ON public.site_visits;
REVOKE ALL ON public.site_visits FROM anon;
REVOKE ALL ON public.site_visits FROM authenticated;
GRANT ALL ON public.site_visits TO service_role;
CREATE POLICY site_visits_admin_select ON public.site_visits
  FOR SELECT TO authenticated
  USING (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

-- 3. Storage: explicit owner-scoped rules; all other buckets are server-only
DROP POLICY IF EXISTS avatars_owner_select ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;

CREATE POLICY avatars_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- captain-docs / event-fliers / fundraising-assets / branding have no policies on
-- purpose: they are reached only through role-checked server functions and the
-- same-origin proxy routes, which use the service role.

-- 4. SECURITY DEFINER functions: remove direct callability where not needed
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_admin_text(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_superuser(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_leadership(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_fundraiser_reviewer(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_manage_events(uuid) FROM anon, public;

REVOKE ALL ON FUNCTION public.increment_site_visits() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.increment_site_visits() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.grant_admin_for_kemper() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

-- Role checks stay callable by signed-in users (used by RLS policies and
-- authenticated server functions).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_text(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_superuser(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_fundraiser_reviewer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_events(uuid) TO authenticated, service_role;