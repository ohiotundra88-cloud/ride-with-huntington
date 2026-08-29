-- Role helper: who may compose and send team messages
CREATE OR REPLACE FUNCTION public.can_send_messages(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role::text IN ('captain','cochair','superuser','admin'))
  END;
$$;

-- ============ messages ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_href text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'draft',
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid NOT NULL,
  created_by_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_priority_chk CHECK (priority IN ('info','important','urgent')),
  CONSTRAINT messages_status_chk CHECK (status IN ('draft','scheduled','sent')),
  CONSTRAINT messages_category_chk CHECK (category IN ('reminder','deadline','event','fundraising','general'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can read all messages"
ON public.messages FOR SELECT TO authenticated
USING (public.can_send_messages(auth.uid()));

CREATE POLICY "Senders can create messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (public.can_send_messages(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Senders can update messages"
ON public.messages FOR UPDATE TO authenticated
USING (public.can_send_messages(auth.uid()) AND (created_by = auth.uid() OR public.is_superuser(auth.uid())))
WITH CHECK (public.can_send_messages(auth.uid()));

CREATE POLICY "Superusers can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (public.is_superuser(auth.uid()));

CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_messages_status ON public.messages (status, sent_at DESC);

-- ============ message_recipients ============
CREATE TABLE public.message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_recipients TO authenticated;
GRANT ALL ON public.message_recipients TO service_role;

ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can read their own rows"
ON public.message_recipients FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_send_messages(auth.uid()));

CREATE POLICY "Senders can add recipients"
ON public.message_recipients FOR INSERT TO authenticated
WITH CHECK (public.can_send_messages(auth.uid()));

CREATE POLICY "Recipients can mark their own row"
ON public.message_recipients FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.can_send_messages(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.can_send_messages(auth.uid()));

CREATE POLICY "Superusers can delete recipients"
ON public.message_recipients FOR DELETE TO authenticated
USING (public.is_superuser(auth.uid()));

CREATE INDEX idx_message_recipients_user ON public.message_recipients (user_id, read_at);
CREATE INDEX idx_message_recipients_message ON public.message_recipients (message_id);

CREATE POLICY "Recipients can read messages sent to them"
ON public.messages FOR SELECT TO authenticated
USING (
  status = 'sent' AND EXISTS (
    SELECT 1 FROM public.message_recipients r
    WHERE r.message_id = messages.id AND r.user_id = auth.uid()
  )
);

-- ============ message_audit ============
CREATE TABLE public.message_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.message_audit TO authenticated;
GRANT ALL ON public.message_audit TO service_role;

ALTER TABLE public.message_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can read message audit"
ON public.message_audit FOR SELECT TO authenticated
USING (public.can_send_messages(auth.uid()));

CREATE POLICY "Senders can append message audit"
ON public.message_audit FOR INSERT TO authenticated
WITH CHECK (public.can_send_messages(auth.uid()));

CREATE INDEX idx_message_audit_message ON public.message_audit (message_id, created_at DESC);