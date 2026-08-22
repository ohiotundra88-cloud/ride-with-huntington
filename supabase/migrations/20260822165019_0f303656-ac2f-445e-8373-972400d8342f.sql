-- =========================================================
-- Mini fundraising pages
-- =========================================================

CREATE TABLE public.fundraisers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'donation',
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  cover_path text,
  cover_name text,
  goal_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  opens_at timestamp with time zone,
  closes_at timestamp with time zone,
  status text NOT NULL DEFAULT 'draft',
  is_demo boolean NOT NULL DEFAULT true,
  allow_custom_amount boolean NOT NULL DEFAULT true,
  min_custom_amount numeric(12,2) NOT NULL DEFAULT 5,
  draw_at timestamp with time zone,
  beneficiary text NOT NULL DEFAULT '',
  contact_email text,
  season text NOT NULL DEFAULT '2026',
  request_id uuid REFERENCES public.fundraiser_requests(id) ON DELETE SET NULL,
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_name text NOT NULL DEFAULT '',
  published_at timestamp with time zone,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fundraisers_kind_chk CHECK (kind IN ('donation','raffle','tickets','sponsorship','auction')),
  CONSTRAINT fundraisers_status_chk CHECK (status IN ('draft','pending_approval','live','closed','paid_out','cancelled')),
  CONSTRAINT fundraisers_goal_chk CHECK (goal_amount >= 0)
);

GRANT SELECT ON public.fundraisers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.fundraisers TO authenticated;
GRANT ALL ON public.fundraisers TO service_role;
ALTER TABLE public.fundraisers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read live or closed fundraisers"
  ON public.fundraisers FOR SELECT TO anon, authenticated
  USING (status IN ('live','closed','paid_out'));

CREATE POLICY "Organizers can read their own fundraisers"
  ON public.fundraisers FOR SELECT TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "Leadership can read all fundraisers"
  ON public.fundraisers FOR SELECT TO authenticated
  USING (public.is_leadership(auth.uid()));

CREATE POLICY "Members can create their own fundraisers"
  ON public.fundraisers FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid() AND status IN ('draft','pending_approval'));

CREATE POLICY "Organizers can edit their own draft fundraisers"
  ON public.fundraisers FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Leadership can edit any fundraiser"
  ON public.fundraisers FOR UPDATE TO authenticated
  USING (public.is_leadership(auth.uid()))
  WITH CHECK (public.is_leadership(auth.uid()));

CREATE TRIGGER trg_fundraisers_updated_at BEFORE UPDATE ON public.fundraisers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fundraisers_status ON public.fundraisers (status);
CREATE INDEX idx_fundraisers_organizer ON public.fundraisers (organizer_id);

-- ---------------------------------------------------------

CREATE TABLE public.fundraiser_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  quantity_available integer,
  quantity_sold integer NOT NULL DEFAULT 0,
  max_per_order integer NOT NULL DEFAULT 10,
  entries_per_unit integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fundraiser_items_price_chk CHECK (unit_price >= 0),
  CONSTRAINT fundraiser_items_qty_chk CHECK (quantity_available IS NULL OR quantity_available >= 0)
);

GRANT SELECT ON public.fundraiser_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fundraiser_items TO authenticated;
GRANT ALL ON public.fundraiser_items TO service_role;
ALTER TABLE public.fundraiser_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read items of visible fundraisers"
  ON public.fundraiser_items FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id AND f.status IN ('live','closed','paid_out')
  ));

CREATE POLICY "Organizers and leadership can read their items"
  ON public.fundraiser_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ));

CREATE POLICY "Organizers and leadership can manage items"
  ON public.fundraiser_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ));

CREATE TRIGGER trg_fundraiser_items_updated_at BEFORE UPDATE ON public.fundraiser_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fundraiser_items_fundraiser ON public.fundraiser_items (fundraiser_id);

-- ---------------------------------------------------------

CREATE TABLE public.fundraiser_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.fundraiser_items(id) ON DELETE SET NULL,
  supporter_name text NOT NULL DEFAULT '',
  supporter_email text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  anonymous boolean NOT NULL DEFAULT false,
  message text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'demo',
  provider_session_id text,
  provider_payment_id text,
  paid_at timestamp with time zone,
  refunded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fundraiser_orders_status_chk CHECK (status IN ('pending','paid','refunded','failed')),
  CONSTRAINT fundraiser_orders_amount_chk CHECK (amount >= 0 AND fee_amount >= 0),
  CONSTRAINT fundraiser_orders_qty_chk CHECK (quantity > 0)
);

GRANT SELECT ON public.fundraiser_orders TO authenticated;
GRANT ALL ON public.fundraiser_orders TO service_role;
ALTER TABLE public.fundraiser_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and leadership can read orders"
  ON public.fundraiser_orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ));

CREATE TRIGGER trg_fundraiser_orders_updated_at BEFORE UPDATE ON public.fundraiser_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fundraiser_orders_fundraiser ON public.fundraiser_orders (fundraiser_id);
CREATE INDEX idx_fundraiser_orders_status ON public.fundraiser_orders (status);

-- ---------------------------------------------------------

CREATE TABLE public.fundraiser_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.fundraiser_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.fundraiser_items(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'raffle_entry',
  entry_number integer,
  bid_amount numeric(12,2),
  supporter_name text NOT NULL DEFAULT '',
  supporter_email text NOT NULL DEFAULT '',
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fundraiser_entries_kind_chk CHECK (kind IN ('raffle_entry','auction_bid'))
);

GRANT SELECT ON public.fundraiser_entries TO authenticated;
GRANT ALL ON public.fundraiser_entries TO service_role;
ALTER TABLE public.fundraiser_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and leadership can read entries"
  ON public.fundraiser_entries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ));

CREATE INDEX idx_fundraiser_entries_fundraiser ON public.fundraiser_entries (fundraiser_id);
CREATE INDEX idx_fundraiser_entries_order ON public.fundraiser_entries (order_id);

-- ---------------------------------------------------------

CREATE TABLE public.fundraiser_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  recipient text NOT NULL,
  transfer_date date NOT NULL,
  reference text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fundraiser_payouts_amount_chk CHECK (gross_amount >= 0 AND fee_amount >= 0 AND net_amount >= 0)
);

GRANT SELECT ON public.fundraiser_payouts TO authenticated;
GRANT ALL ON public.fundraiser_payouts TO service_role;
ALTER TABLE public.fundraiser_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and leadership can read payouts"
  ON public.fundraiser_payouts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ));

CREATE INDEX idx_fundraiser_payouts_fundraiser ON public.fundraiser_payouts (fundraiser_id);

-- ---------------------------------------------------------

CREATE TABLE public.fundraiser_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fundraiser_audit TO authenticated;
GRANT ALL ON public.fundraiser_audit TO service_role;
ALTER TABLE public.fundraiser_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and leadership can read fundraiser history"
  ON public.fundraiser_audit FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fundraisers f
    WHERE f.id = fundraiser_id
      AND (f.organizer_id = auth.uid() OR public.is_leadership(auth.uid()))
  ));

CREATE INDEX idx_fundraiser_audit_fundraiser ON public.fundraiser_audit (fundraiser_id, created_at DESC);