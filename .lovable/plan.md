## Keep email-only sign-in, make the intent obvious

You asked why sign-in doesn't prompt for a password. Short answer: while the 6-digit verification code is disabled, the app signs you in using a hidden demo password derived from your email — so nothing extra is needed from you. You confirmed you want to keep this flow for the demo. The only thing to fix is the UI copy, so this reads as "one-tap demo access" instead of "the password field is missing."

## What changes

- Sign-in page copy
  - Headline stays "Sign in to the Hub."
  - Sub-copy becomes: "Demo mode — enter your @huntington.com email to sign in instantly. No password or verification code required right now."
  - Button label changes from "Sign in" to "Continue with work email."
  - Add a small footnote near the button: "Password and email verification are temporarily disabled for this preview."

- Nothing else moves
  - No new password field, no OTP step, no changes to auth logic, database, or admin flow.
  - Christopher.kemper@huntington.com stays auto-admin.

## Not doing (for now)

- Adding a visible password field or "Remember me."
- Re-enabling the 6-digit email code.

If you want either later, say the word and I'll add it in one pass.
