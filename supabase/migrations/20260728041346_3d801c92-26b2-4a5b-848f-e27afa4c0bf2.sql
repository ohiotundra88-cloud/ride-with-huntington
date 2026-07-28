
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_own_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ PARTICIPANTS ============
CREATE TABLE public.participants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  participation text,
  pelotonia jsonb NOT NULL DEFAULT '{}'::jsonb,
  travel jsonb NOT NULL DEFAULT '{}'::jsonb,
  bike jsonb NOT NULL DEFAULT '{}'::jsonb,
  apparel jsonb NOT NULL DEFAULT '{}'::jsonb,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  audit jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  reg_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_own_all" ON public.participants FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "participants_admin_select" ON public.participants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ FAQS ============
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  body text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_public_select" ON public.faqs FOR SELECT TO anon, authenticated USING (hidden = false);
CREATE POLICY "faqs_admin_select_all" ON public.faqs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "faqs_admin_insert" ON public.faqs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "faqs_admin_update" ON public.faqs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "faqs_admin_delete" ON public.faqs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATED_AT TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUTH TRIGGERS ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.grant_admin_for_kemper()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'chris.kemper@huntington.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER grant_admin_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_kemper();

CREATE TRIGGER grant_admin_on_confirm
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_kemper();

-- ============ SEED FAQs ============
INSERT INTO public.faqs (source_id, title, category, keywords, body, is_builtin) VALUES
('reg-1','How do I register for Team Huntington?','Registration',ARRAY['register','sign up','team'],'Use the Team Huntington Hub to be guided through registration. You''ll select participation type, apply the team discount code, and confirm on Pelotonia''s site.',true),
('reg-2','What is the Team Huntington discount code?','Registration',ARRAY['discount','code','promo'],'Your unique team code appears on the registration step. Copy it and paste it into the Pelotonia registration page.',true),
('reg-3','Can I change from Volunteer to Rider later?','Registration',ARRAY['change','switch','role'],'Yes. Return to the Hub and edit your registration. Some downstream steps (bike rental, jersey) will appear once you switch to Rider.',true),
('reg-4','Is there a registration deadline?','Registration',ARRAY['deadline','date'],'Team Huntington registration closes 30 days before Ride Weekend. Travel and apparel deadlines are earlier — see your dashboard.',true),
('reg-5','Where can I see my confirmation number?','Registration',ARRAY['confirmation','number','receipt'],'After completing Pelotonia registration, enter the confirmation number in the Hub. You can also view it on your dashboard and confirmation email.',true),
('trv-1','How do I book travel through Concur / ATG?','Travel',ARRAY['concur','atg','book','flight'],'Use the Travel step in the Hub. Click ''Open Concur / ATG'' to launch the corporate travel tool. Return to the Hub and enter your confirmation number.',true),
('trv-2','Is Huntington paying for my hotel?','Travel',ARRAY['hotel','pay','reimburse'],'Approved lodging for Ride Weekend is reimbursable per Team Huntington policy. See the Expense Guide for details.',true),
('trv-3','What if I need to arrive early?','Travel',ARRAY['early','extra night'],'Add a note in the Travel step. Additional nights may require manager approval.',true),
('trv-4','Can I book my own flight?','Travel',ARRAY['own','flight','reimburse'],'Corporate policy requires Concur / ATG for reimbursement. Contact Support if you have an exception.',true),
('trv-5','What is the arrival window for Ride Weekend?','Travel',ARRAY['arrival','window','check-in'],'Riders should arrive by Friday afternoon for packet pickup. Volunteers per role assignment.',true),
('bk-1','How do I rent a bike?','Bike Rental',ARRAY['bike','rent','unlimited'],'In the Bike step, choose Yes, enter your specs, and open Unlimited Biking. Return to the Hub with your confirmation.',true),
('bk-2','What size bike should I choose?','Bike Rental',ARRAY['size','fit','height'],'Enter your height and use Unlimited Biking''s sizing guide. When in doubt, choose one size up for comfort.',true),
('bk-3','Are helmets provided?','Bike Rental',ARRAY['helmet','safety'],'Helmets are strongly recommended and can be added to your rental.',true),
('bk-4','Can I bring my own bike?','Bike Rental',ARRAY['own','bring'],'Yes. Select ''No'' on the Bike Rental step. Follow Pelotonia''s bike shipping / drop-off guidance.',true),
('ap-1','How do jersey sizes run?','Apparel',ARRAY['jersey','size','fit'],'Cycling jerseys run one size smaller than everyday shirts. Consider sizing up if between sizes.',true),
('ap-2','When will I receive my apparel?','Apparel',ARRAY['ship','receive','delivery'],'Apparel ships 2–3 weeks before Ride Weekend to the address you confirm in the Hub.',true),
('ap-3','Can I change my size after submitting?','Apparel',ARRAY['change','size'],'You can edit your registration until the apparel deadline shown on your dashboard.',true),
('fr-1','What is the Team Huntington fundraising minimum?','Fundraising',ARRAY['fundraise','minimum','goal'],'Minimums vary by route. See your Pelotonia rider profile for your goal. Huntington matches up to a set amount — see policy.',true),
('fr-2','Does Huntington match my fundraising?','Fundraising',ARRAY['match','corporate'],'Yes, per current match policy. Submit your match request through the internal giving portal.',true),
('rw-1','What should I bring to Ride Weekend?','Ride Weekend',ARRAY['checklist','pack'],'See the Ride Weekend Checklist: jersey, helmet, ID, hydration, sunscreen, and Team Huntington gear.',true),
('rw-2','Where is packet pickup?','Ride Weekend',ARRAY['packet','pickup','expo'],'Packet pickup is at the Pelotonia Expo. Times are shared closer to the event.',true),
('rw-3','Is there a Team Huntington gathering?','Ride Weekend',ARRAY['gathering','meet','team'],'Yes — a team breakfast is hosted Saturday morning, August 7, 2027. Location shared via confirmation email.',true),
('vol-1','What do volunteers do at Ride Weekend?','Volunteers',ARRAY['volunteer','role','shift'],'Volunteers staff rest stops, cheer stations, packet pickup, and finish line hospitality.',true),
('vol-2','Do volunteers get shirts?','Volunteers',ARRAY['shirt','apparel','volunteer'],'Yes — enter your volunteer shirt size in the Apparel step.',true),
('ex-1','How do I submit Pelotonia expenses?','Expense Reports',ARRAY['expense','concur','submit'],'Follow the Expense Guide in the Hub. Use the ''Team Huntington Pelotonia'' cost center and attach receipts over $25.',true),
('ex-2','What expenses are reimbursable?','Expense Reports',ARRAY['reimburse','eligible'],'Approved travel, lodging, and meals within per-diem. Personal fundraising donations are not reimbursable.',true),
('ex-3','What if I lost a receipt?','Expense Reports',ARRAY['missing','receipt','lost'],'Attach a Missing Receipt Affidavit in Concur. Include vendor, date, and business purpose.',true),
('ex-4','How long does approval take?','Expense Reports',ARRAY['approval','time','status'],'Most reports are approved within 5–7 business days. Track status in Concur Expense.',true);
