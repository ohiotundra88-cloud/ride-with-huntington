ALTER TABLE public.fundraisers
  ADD COLUMN IF NOT EXISTS flier_path text,
  ADD COLUMN IF NOT EXISTS flier_name text,
  ADD COLUMN IF NOT EXISTS flier_content_type text;