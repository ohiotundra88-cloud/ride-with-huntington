-- Remove the blanket privileges on public.profiles and re-grant only what is needed.
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT, INSERT ON public.profiles TO authenticated;

-- Column-level UPDATE: privileged columns (has_vendor_dashboard_access,
-- activated_at, id, created_at) are intentionally excluded, so an
-- authenticated user cannot grant themselves vendor dashboard access even
-- though the row-level policy lets them edit their own profile row.
GRANT UPDATE (
  email,
  full_name,
  updated_at,
  avatar_path,
  avatar_content_type,
  avatar_updated_at,
  mobile,
  segment,
  market,
  manager,
  consent
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;