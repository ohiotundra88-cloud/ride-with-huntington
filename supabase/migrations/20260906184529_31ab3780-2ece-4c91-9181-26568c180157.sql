ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT '';
GRANT UPDATE (region) ON public.profiles TO authenticated;