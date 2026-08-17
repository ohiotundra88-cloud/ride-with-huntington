REVOKE ALL ON FUNCTION public.can_manage_events(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_text(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_events(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_text(uuid) TO authenticated, service_role;