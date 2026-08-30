ALTER TABLE public.fundraisers
  ADD COLUMN IF NOT EXISTS public_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Public can read live or closed fundraisers" ON public.fundraisers;
CREATE POLICY "Public can read live or closed fundraisers"
ON public.fundraisers FOR SELECT TO anon, authenticated
USING (public_hidden = false AND status = ANY (ARRAY['live'::text, 'closed'::text, 'paid_out'::text]));