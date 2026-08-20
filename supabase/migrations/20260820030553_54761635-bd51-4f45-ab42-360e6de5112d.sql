REVOKE EXECUTE ON FUNCTION public.can_view_vendors(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_archive_vendors(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_purge_vendors(uuid) FROM anon;