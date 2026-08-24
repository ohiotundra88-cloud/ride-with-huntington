CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT 'All',
  category text NOT NULL DEFAULT 'General',
  hours text NOT NULL DEFAULT '',
  emergency boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view active contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (active OR public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE POLICY "Admins and super users can add contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE POLICY "Admins and super users can edit contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()))
  WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE POLICY "Admins and super users can delete contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.contacts (name, role, email, phone, department, region, category, hours, emergency, active, sort_order) VALUES
  ('Priya Shah', 'Team Captain', 'priya.shah@hub.demo', '(614) 555-0111', 'Corporate Responsibility', 'Columbus, OH', 'General', 'Mon–Fri 9–5 ET', false, true, 1),
  ('Marcus Reed', 'Travel Coordinator', 'marcus.reed@hub.demo', '(614) 555-0122', 'Corporate Travel', 'All', 'Travel', 'Mon–Fri 8–6 ET', false, true, 2),
  ('Ride Weekend Hotline', '24/7 Rider Support', 'hotline@hub.demo', '(614) 555-0999', 'Ride Weekend Ops', 'All', 'Emergency', 'Aug 6–8 · 24 hours', true, true, 3),
  ('Alex Bennett', 'Volunteer Lead', 'alex.bennett@hub.demo', '(614) 555-0144', 'Volunteer Ops', 'All', 'Volunteers', 'Mon–Fri 9–5 ET', false, true, 4);