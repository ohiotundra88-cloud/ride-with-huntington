-- 1) New appointable roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'legal';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'risk';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cochair';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superuser';

-- 2) Participant season persistence
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS manual_entry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT '2027';

-- 3) Helper functions
CREATE OR REPLACE FUNCTION public.is_superuser(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'superuser'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_fundraiser_reviewer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin','superuser','captain','legal','risk','compliance','marketing','cochair')
  );
$$;

-- 4) Fundraiser requests
CREATE TABLE public.fundraiser_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'in_person',
  event_date date NOT NULL,
  start_time text,
  end_time text,
  location text,
  expected_attendance integer,
  fundraising_method text,
  contact_name text,
  contact_email text,
  contact_phone text,
  flier_path text,
  flier_name text,
  status text NOT NULL DEFAULT 'submitted',
  captain_status text NOT NULL DEFAULT 'pending',
  legal_status text NOT NULL DEFAULT 'pending',
  risk_status text NOT NULL DEFAULT 'pending',
  compliance_status text NOT NULL DEFAULT 'pending',
  marketing_status text NOT NULL DEFAULT 'pending',
  cochair_status text NOT NULL DEFAULT 'pending',
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  season text NOT NULL DEFAULT '2027',
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fundraiser_requests_event_type_chk CHECK (event_type IN ('in_person','virtual')),
  CONSTRAINT fundraiser_requests_status_chk CHECK (status IN ('submitted','in_review','changes_requested','declined','approved'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fundraiser_requests TO authenticated;
GRANT ALL ON public.fundraiser_requests TO service_role;
ALTER TABLE public.fundraiser_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY fr_select_own ON public.fundraiser_requests
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY fr_select_reviewers ON public.fundraiser_requests
  FOR SELECT TO authenticated USING (public.is_fundraiser_reviewer(auth.uid()));
CREATE POLICY fr_insert_own ON public.fundraiser_requests
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY fr_update_own_editable ON public.fundraiser_requests
  FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() AND status IN ('submitted','changes_requested'))
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY fr_update_admin ON public.fundraiser_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()))
  WITH CHECK (public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));
CREATE POLICY fr_delete_own_or_admin ON public.fundraiser_requests
  FOR DELETE TO authenticated
  USING (submitted_by = auth.uid() OR public.is_admin_text(auth.uid()) OR public.is_superuser(auth.uid()));

CREATE TRIGGER trg_fundraiser_requests_updated_at
  BEFORE UPDATE ON public.fundraiser_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fundraiser_requests_status ON public.fundraiser_requests (status, event_date);
CREATE INDEX idx_fundraiser_requests_submitter ON public.fundraiser_requests (submitted_by);

-- 5) Approval trail
CREATE TABLE public.fundraiser_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.fundraiser_requests(id) ON DELETE CASCADE,
  stage text NOT NULL,
  decision text NOT NULL,
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fundraiser_approvals_stage_chk CHECK (stage IN ('submitted','captain','legal','risk','compliance','marketing','cochair','published')),
  CONSTRAINT fundraiser_approvals_decision_chk CHECK (decision IN ('submitted','approved','changes_requested','declined','published'))
);

GRANT SELECT ON public.fundraiser_approvals TO authenticated;
GRANT ALL ON public.fundraiser_approvals TO service_role;
ALTER TABLE public.fundraiser_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY fa_select_visible ON public.fundraiser_approvals
  FOR SELECT TO authenticated USING (
    public.is_fundraiser_reviewer(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.fundraiser_requests r
      WHERE r.id = request_id AND r.submitted_by = auth.uid()
    )
  );

CREATE INDEX idx_fundraiser_approvals_request ON public.fundraiser_approvals (request_id, created_at);