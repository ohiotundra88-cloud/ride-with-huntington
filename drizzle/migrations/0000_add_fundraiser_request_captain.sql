ALTER TABLE public.fundraiser_requests
  ADD COLUMN IF NOT EXISTS captain_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fundraiser_requests_captain_status_idx
  ON public.fundraiser_requests (captain_id, status);