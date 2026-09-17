-- Defense in depth: block self-service changes to admin-managed profile columns
CREATE OR REPLACE FUNCTION public.profile_privileged_unchanged(
  _id uuid,
  _vendor_access boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _id
      AND p.has_vendor_dashboard_access IS NOT DISTINCT FROM _vendor_access
  );
$$;

REVOKE ALL ON FUNCTION public.profile_privileged_unchanged(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_privileged_unchanged(uuid, boolean) TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND public.profile_privileged_unchanged(id, has_vendor_dashboard_access)
);

-- Keep the trigger authoritative as well (already reverts privileged columns for
-- authenticated writers); ensure it is present on both INSERT and UPDATE.
DROP TRIGGER IF EXISTS trg_profiles_protect_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_protect_privileged
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();
