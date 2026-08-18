CREATE OR REPLACE FUNCTION public.is_leadership(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','superuser','captain','legal','risk','compliance','marketing','cochair')
  );
$$;

CREATE TABLE public.captain_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Update',
  pinned boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  file_path text,
  file_name text,
  content_type text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.captain_posts TO authenticated;
GRANT ALL ON public.captain_posts TO service_role;

ALTER TABLE public.captain_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY captain_posts_leadership_select ON public.captain_posts
  FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

CREATE POLICY captain_posts_leadership_insert ON public.captain_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_leadership(auth.uid()) AND created_by = auth.uid());

CREATE POLICY captain_posts_author_update ON public.captain_posts
  FOR UPDATE TO authenticated
  USING ((created_by = auth.uid() AND public.is_leadership(auth.uid())) OR public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()))
  WITH CHECK (public.is_leadership(auth.uid()));

CREATE POLICY captain_posts_author_delete ON public.captain_posts
  FOR DELETE TO authenticated
  USING ((created_by = auth.uid() AND public.is_leadership(auth.uid())) OR public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE TRIGGER trg_captain_posts_updated_at
  BEFORE UPDATE ON public.captain_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();