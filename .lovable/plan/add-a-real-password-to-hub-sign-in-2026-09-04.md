# Add a real password to Hub sign-in

## The problem (confirmed in the code)

Today, once an account has been activated, signing in needs only the email address. The Hub silently makes up the password for you from the email itself (`signin.tsx` builds it from the address, and the server resets the account to that value on every sign-in). So anyone who types a colleague's `@huntington.com` address — including a Super User's — is let straight in.

## What we'll build

1. **Choose a password at activation.** After a first-time colleague enters the emailed 6-digit code, they set their own password (twice, with a strength check: at least 10 characters, not a known-breached password). That password is what unlocks the account from then on.
2. **Password required at sign-in.** The sign-in screen asks for email, then password. No more email-only entry, and the "make up a password from the email" behaviour is removed everywhere.
3. **Existing colleagues get a one-time reset.** Everyone already activated currently has the guessable password. On their next sign-in they'll be told to set a new one: they request a 6-digit code by email, enter it, and choose a password. Their access, roles and registration data are untouched.
4. **Forgot password.** A "Forgot password" link on the sign-in screen sends the same 6-digit code and lets them pick a new one.
5. **Super User safety net.** In the Super User area, a "Send password reset code" action for a colleague who is stuck — it emails them a code; it never reveals or sets a password for them.
6. **Brute-force protection.** Repeated wrong passwords for the same email are slowed down and eventually blocked for a short window, and a plain "email or password is incorrect" message is shown either way so it doesn't reveal who has an account.

## Notes

- Admin-created colleagues (added manually in the Super User area) will no longer get a pre-set password — they'll activate with an emailed code and choose their own, same as everyone else.
- Password emails use the branded Team Huntington code template already in place, so the corporate filter has nothing to block.

## Technical detail

- Remove `derivedPassword` from `src/routes/signin.tsx` and `demoPasswordFor` from `src/lib/participants-admin.server.ts`; delete/retire `ensureDemoAccount` in `src/lib/auth-demo.functions.ts` (it resets any activated account's password on demand — an escalation path in itself).
- Sign-in flow becomes: `checkActivation` → if activated, `supabase.auth.signInWithPassword`; if not, `signInWithOtp` → `verifyOtp` → set-password step → `completeActivation({ password })` (already takes a password and stamps `activated_at`).
- Add `password_set_at` to `public.profiles` (locked from self-update by the existing `protect_profile_privileged_columns` trigger and the column-scoped GRANT). Activated accounts with a null value are routed through the one-time reset flow.
- Password reset for signed-out users: OTP verify (`type: "email"` / recovery) then a `requireSupabaseAuth` server fn that calls `auth.admin.updateUserById` for the caller's own id only and stamps `password_set_at`.
- Super User action reuses `is_superuser` gating, mirroring `setActivationForUser` in `src/lib/activation.functions.ts`; it only triggers an email.
- Throttling table keyed by email hash + IP, checked in the sign-in server fn before the password attempt.
