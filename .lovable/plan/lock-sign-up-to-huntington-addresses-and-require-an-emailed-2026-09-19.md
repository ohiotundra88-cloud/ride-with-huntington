# Lock sign-up to Huntington addresses and require an emailed code

## What I checked (confirmed facts)

- This project runs on **Lovable Cloud** (the built-in backend), not an outside Supabase account.
- The migration `20260919000000_restrict_huntington_registration.sql` exists in the repo but is **not applied**: neither `before_huntington_user_created` nor `enforce_huntington_auth_email` exists in the database, and the only triggers on the accounts table are the three pre-existing ones.
- Existing accounts: **15 total, all @huntington.com, all with a confirmed email address.** Applying this change locks nobody out, and no account gets deleted.
- Sign-in already supports both paths: emailed code (one-time passcode) and personal password.

## What gets built

1. **Apply the guard rules to the database** — the merged SQL, unchanged: the sign-up hook that rejects any address outside @huntington.com with a clear message, plus the safety-net rule that also blocks switching an existing account to an outside address (including pending address-change requests). Existing accounts are untouched.
2. **Turn on the sign-up hook** so it actually runs for every new account, including anyone hitting the sign-up endpoint directly rather than through our screens.
3. **Require email confirmation** so a brand-new account cannot sign in until the emailed code is entered.
4. **Keep the current email sending as-is** — the existing notify.ridewithhuntington.com sender, branded templates, and the auth email timeline stay exactly as they are. No template rewrites.
5. **Verify** with two live checks: a sign-up attempt with a non-Huntington address (must be refused with no account created) and a confirmation that a brand-new, unconfirmed account cannot reach any signed-in page.
6. **Report** what is confirmed active versus what you need to test with a real mailbox.

## Known limitation to decide on

The six-digit / 10-minute code setting is a project-level email setting. The repo records it (`otp_length = 6`, `otp_expiry = 600`), but on Lovable Cloud I cannot change that setting from here — and you previously received an **8-digit** code, which means the live setting is longer than six. Two options:

- I apply everything above, confirm what the live code length actually is, and tell you the one switch to flip yourself if it is still not six.
- Or we leave the code length alone (the sign-in screen already accepts both lengths) and only the expiry/confirmation requirement matters.

Either way the security behaviour — Huntington-only, must confirm before access — is fully in place.

## Technical notes

- Applied via the migration tool with the file's SQL byte-for-byte; it creates two `SECURITY INVOKER` functions with `search_path = ''`, revokes execute from `public`/`anon`/`authenticated`, grants execute on the hook to `supabase_auth_admin`, and adds the `BEFORE INSERT OR UPDATE OF email, email_change` trigger on the accounts table.
- Email confirmation is enabled through the auth configuration tool (`auto_confirm_email: false`); `supabase/config.toml` already declares `enable_confirmations`, `double_confirm_changes`, `otp_expiry = 600`, `otp_length = 6` and the `before_user_created` hook pointing at `pg-functions://postgres/public/before_huntington_user_created`.
- App-side validation in `src/lib/huntington-email.ts` and `requireConfirmedHuntingtonUser` already rejects unconfirmed and non-Huntington users in activation/password paths — this change makes the database enforce the same thing.
- Verification uses direct calls against the sign-up endpoint plus `tests/huntington-email.test.ts` and `supabase/tests/huntington_registration.sql` (the SQL test uses a temp table and creates no real users).
- Still needs a human test with a real Huntington mailbox: code delivery, wrong/expired code rejection, code reuse rejection, password set-up afterwards, resend, and password reset. Unit and SQL tests do not prove delivery.
