# Huntington-only registration deployment

This change is NOT live merely because the code is merged. Apply and verify
the hosted Auth configuration as well as deploying the app.

## Rollout

1. Test the migration in a staging Supabase project first. It adds an Auth
   creation hook plus a trigger guarding new accounts and email changes.
2. Apply `supabase/migrations/20260919000000_restrict_huntington_registration.sql`.
3. In hosted Supabase Authentication settings, enable **Confirm email**, enable
   confirmation of email changes, and set email OTP lifetime to 600 seconds
   and length to 6. The checked-in config records these settings but does not
   prove they are enabled in the hosted project.
4. Under Authentication → Hooks, enable **Before User Created** using
   `public.before_huntington_user_created`. Retain the existing Send Email hook:
   the existing signup and magic-link templates already render numeric codes.
   If using Supabase templates instead, include `{{ .Token }}` in both templates.
5. Deploy the application changes. Activation/password setup now requires an
   already-confirmed Huntington address and no longer auto-confirms users.
6. Audit existing Auth accounts with outside addresses or unverified mailboxes.
   This migration does not delete users, revoke old sessions, or retrospectively
   prove mailbox ownership for accounts previously confirmed by administrators.
   Decide separately how to retire such accounts without locking out legitimate users.

## Verification

- Node 22.18+ or 24: `node --test tests/huntington-email.test.ts`.
- Build: `npm run build`.
- Staging SQL: `psql -v ON_ERROR_STOP=1 "$STAGING_DATABASE_URL" -f supabase/tests/huntington_registration.sql`.
- Direct Auth API: verify Gmail and lookalike-domain password and OTP signups
  fail without creating a user (not just a browser validation error).
- With an authorized Huntington test mailbox, start registration: code arrives,
  no session/protected access exists before verification; wrong/expired codes
  fail; the correct code works; reusing it fails; password setup then succeeds.
- Confirm direct password signup cannot get a session before email confirmation.
- Test resend, existing password login, password reset, and changing an account
  to an outside email (must fail). Confirm legitimate Huntington email changes
  still require confirmation.

Do not treat passing pure-function unit tests as a live Auth/email delivery test.
The SQL test uses a temporary table and never creates real users or sends email.

Reference: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
