# Re-enable one-time email passcode activation

Bring back the emailed 6-digit code, required once per person, to prove they control an @huntington.com mailbox before their account can access the Hub. After activation, sign-in stays as instant as it is today.

## What changes for users

1. Someone enters their work email on the sign-in screen (still restricted to @huntington.com).
2. If their account has never been activated, the Hub emails them a 6-digit code and shows a code entry step.
3. Entering the correct code activates the account and signs them in.
4. Every later sign-in for that person is instant — no code.
5. Anyone already signed in today stays signed in and is treated as already activated, so nobody is locked out.
6. If the code doesn't arrive, a "Resend code" button is available after a short cooldown.

## Prerequisite: email sending

Auth emails currently have no sender domain configured for this project, so codes cannot be delivered yet. Built-in Cloud email still needs a real domain you own for the sender address. Two options:

- Use ridewithhuntington.com (already connected to the site) as the email sender domain — recommended.
- Skip and keep the current instant sign-in until a domain is ready.

Setting this up is a short guided dialog; DNS records get verified in the background. Codes only reach inboxes after verification, so the passcode step gets enabled last, once sending is live.

Note: Huntington's mail security may filter or delay mail from a newly verified domain. Plan on testing with a couple of real @huntington.com mailboxes before turning it on for everyone.

## Build steps

1. **Email setup** — configure ridewithhuntington.com as the sender domain and scaffold branded auth email templates matching the Hub's look. Style the passcode email with the existing brand colors and clear "code expires in 10 minutes" wording.
2. **Activation state** — add an `activated_at` timestamp to user profiles. Backfill every existing profile as activated so current users never see the code step.
3. **Send code** — a server-side action that validates the @huntington.com domain and triggers the emailed one-time code for that address. Rate-limited per email to prevent abuse.
4. **Verify code** — a server-side action that verifies the submitted code, and only on success marks the profile activated and returns a session.
5. **Sign-in screen** — two-step UI: email step, then code step (using the existing OTP input component). Resend with cooldown, clear error states, back link to change the email.
6. **Enforce server-side** — the access gate treats "no `activated_at`" as not activated. Unactivated accounts get sent back to the code step even if they hold a session, so the check cannot be skipped by navigating directly.
7. **Raise the auth email hourly limit** so a burst of new participants signing up doesn't hit the default cap.
8. **Super User escape hatch** — on the existing user management screen, let a Super User manually mark a user activated for the rare case where email delivery fails entirely.

## Technical notes

- Uses Cloud's built-in email OTP (`signInWithOtp` with a 6-digit code, verified via `verifyOtp`) rather than a hand-rolled code table, so codes, expiry, and single-use enforcement are handled by the auth layer.
- Auto-confirm on email signup gets turned off as part of this, otherwise the verification step is bypassed.
- The existing deterministic-password path in `src/lib/auth-demo.functions.ts` stays for already-activated users, keeping sign-in instant; it is gated on `activated_at` being set.
- `profiles.activated_at` is writable only by the server (service role) or a Super User; a database trigger blocks users from setting it on themselves, matching the existing pattern used for vendor dashboard access.

## Open question

Once activation is live, should the fully public pages (family & spectator guide, shared fundraiser links) stay open to non-Huntington visitors? The plan assumes yes — they remain public.
