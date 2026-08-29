ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Signed-in users can view active contacts" ON public.contacts;

CREATE POLICY "Leadership can view all contacts"
ON public.contacts FOR SELECT TO authenticated
USING (public.is_leadership(auth.uid()));

CREATE POLICY "Members can view shared active contacts"
ON public.contacts FOR SELECT TO authenticated
USING (active AND NOT internal_only);