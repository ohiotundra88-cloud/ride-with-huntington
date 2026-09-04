ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS email_notify boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_exclude_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS email_sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_skipped_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;

GRANT UPDATE(email_opt_out) ON public.profiles TO authenticated;