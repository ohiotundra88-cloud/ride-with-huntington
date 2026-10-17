-- Remove the four sample contacts the original prototype seeded
-- (migration 20260824174117: fictional names, 555 numbers, @hub.demo emails).
-- Real contacts are added by admins in /admin/contacts. Safe to re-run.
DELETE FROM public.contacts WHERE email LIKE '%@hub.demo';
