-- 1. New role value (used only via text comparison in this migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor_captain';

-- 2. Profile flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_vendor_dashboard_access boolean NOT NULL DEFAULT false;

-- 3. Authorization helpers
CREATE OR REPLACE FUNCTION public.can_view_vendors(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('superuser','cochair'))
      OR (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'vendor_captain')
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.has_vendor_dashboard_access)
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_archive_vendors(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('superuser','cochair'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_purge_vendors(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'superuser')
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_vendors(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_archive_vendors(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_purge_vendors(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_vendors(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_archive_vendors(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_purge_vendors(uuid) TO authenticated;

-- 4. Vendors
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  status text NOT NULL DEFAULT 'Prospect',
  business_segment text,
  internal_business_segment text,
  relationship_owner text,
  secondary_relationship_owner text,
  internal_notes text NOT NULL DEFAULT '',
  primary_contact_name text,
  primary_contact_phone text,
  general_notes text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  archived_by uuid,
  archived_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_select ON public.vendors FOR SELECT TO authenticated USING (public.can_view_vendors(auth.uid()));
CREATE POLICY vendors_insert ON public.vendors FOR INSERT TO authenticated WITH CHECK (public.can_view_vendors(auth.uid()) AND created_by = auth.uid());
CREATE POLICY vendors_update ON public.vendors FOR UPDATE TO authenticated USING (public.can_view_vendors(auth.uid())) WITH CHECK (public.can_view_vendors(auth.uid()));
CREATE POLICY vendors_delete ON public.vendors FOR DELETE TO authenticated USING (public.can_purge_vendors(auth.uid()) AND archived = true);
CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX vendors_name_idx ON public.vendors (lower(business_name));

-- 5. Additional contacts
CREATE TABLE public.vendor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text,
  title text,
  phone text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_contacts TO authenticated;
GRANT ALL ON public.vendor_contacts TO service_role;
ALTER TABLE public.vendor_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_contacts_all ON public.vendor_contacts FOR ALL TO authenticated USING (public.can_view_vendors(auth.uid())) WITH CHECK (public.can_view_vendors(auth.uid()));
CREATE TRIGGER trg_vendor_contacts_updated_at BEFORE UPDATE ON public.vendor_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX vendor_contacts_vendor_idx ON public.vendor_contacts (vendor_id);

-- 6. Spend (year 9999 = "Beyond")
CREATE TABLE public.vendor_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  year integer NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_spend TO authenticated;
GRANT ALL ON public.vendor_spend TO service_role;
ALTER TABLE public.vendor_spend ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_spend_all ON public.vendor_spend FOR ALL TO authenticated USING (public.can_view_vendors(auth.uid())) WITH CHECK (public.can_view_vendors(auth.uid()));
CREATE TRIGGER trg_vendor_spend_updated_at BEFORE UPDATE ON public.vendor_spend FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Donations
CREATE TABLE public.vendor_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  year integer NOT NULL,
  committed_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (committed_amount >= 0),
  actual_donated_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (actual_donated_amount >= 0),
  recipient text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_donations TO authenticated;
GRANT ALL ON public.vendor_donations TO service_role;
ALTER TABLE public.vendor_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_donations_all ON public.vendor_donations FOR ALL TO authenticated USING (public.can_view_vendors(auth.uid())) WITH CHECK (public.can_view_vendors(auth.uid()));
CREATE TRIGGER trg_vendor_donations_updated_at BEFORE UPDATE ON public.vendor_donations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Relationship activity
CREATE TABLE public.vendor_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  contact_date date NOT NULL,
  contacted_by text NOT NULL DEFAULT '',
  contact_method text NOT NULL DEFAULT 'Email',
  interaction_notes text NOT NULL DEFAULT '',
  next_step text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_activity TO authenticated;
GRANT ALL ON public.vendor_activity TO service_role;
ALTER TABLE public.vendor_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_activity_all ON public.vendor_activity FOR ALL TO authenticated USING (public.can_view_vendors(auth.uid())) WITH CHECK (public.can_view_vendors(auth.uid()));
CREATE TRIGGER trg_vendor_activity_updated_at BEFORE UPDATE ON public.vendor_activity FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX vendor_activity_vendor_idx ON public.vendor_activity (vendor_id, contact_date DESC);

-- 9. Attachments
CREATE TABLE public.vendor_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size_bytes integer,
  archived boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_attachments TO authenticated;
GRANT ALL ON public.vendor_attachments TO service_role;
ALTER TABLE public.vendor_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_attachments_select ON public.vendor_attachments FOR SELECT TO authenticated USING (public.can_view_vendors(auth.uid()));
CREATE POLICY vendor_attachments_insert ON public.vendor_attachments FOR INSERT TO authenticated WITH CHECK (public.can_view_vendors(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY vendor_attachments_update ON public.vendor_attachments FOR UPDATE TO authenticated USING (public.can_archive_vendors(auth.uid())) WITH CHECK (public.can_archive_vendors(auth.uid()));
CREATE POLICY vendor_attachments_delete ON public.vendor_attachments FOR DELETE TO authenticated USING (public.can_purge_vendors(auth.uid()) AND archived = true);
CREATE INDEX vendor_attachments_vendor_idx ON public.vendor_attachments (vendor_id);

-- 10. Append-only audit log
CREATE TABLE public.vendor_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid,
  actor_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vendor_audit TO authenticated;
GRANT ALL ON public.vendor_audit TO service_role;
ALTER TABLE public.vendor_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_audit_select ON public.vendor_audit FOR SELECT TO authenticated USING (public.can_view_vendors(auth.uid()));
CREATE POLICY vendor_audit_insert ON public.vendor_audit FOR INSERT TO authenticated WITH CHECK (public.can_view_vendors(auth.uid()) AND actor_id = auth.uid());
CREATE INDEX vendor_audit_vendor_idx ON public.vendor_audit (vendor_id, created_at DESC);
