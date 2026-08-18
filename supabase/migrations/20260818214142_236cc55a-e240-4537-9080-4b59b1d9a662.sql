ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS avatar_content_type text,
  ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;