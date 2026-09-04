CREATE TABLE public.auth_email_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  email_type text NOT NULL,
  subject text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_email_log_sent_at ON public.auth_email_log (sent_at DESC);
CREATE INDEX idx_auth_email_log_email ON public.auth_email_log (lower(email));

GRANT SELECT ON public.auth_email_log TO authenticated;
GRANT ALL ON public.auth_email_log TO service_role;

ALTER TABLE public.auth_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super users can view auth email history"
  ON public.auth_email_log
  FOR SELECT
  TO authenticated
  USING (public.is_superuser(auth.uid()));
