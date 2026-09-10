# Send test emails to yourself

## Goal
Let a Super User send themselves a sample of each app email so they can review exactly what participants receive.

## What you'll get
A new "Test emails" card on the Super User dashboard with one button per email type:
- Team announcement
- Event invitation
- Event cancellation
- Fundraiser request decision

Clicking a button sends that email, filled with realistic sample content, to your own signed-in email address within a few seconds. A "Send all four" button is included too.

## Safety
- Only Super Users can use it — the server checks your role before sending.
- Emails only ever go to your own address; no participant can be emailed from here.
- Each send is recorded in the email delivery log like any real send.

## Technical details
- New server function `sendTestEmail` in `src/lib/test-emails.functions.ts`: gated by `assertSuperUser`, looks up the caller's email from their auth session, calls the existing `sendTemplateEmail` with the template's built-in `previewData`, and marks the subject with a `[TEST]` prefix so samples are easy to spot.
- New card in the Super User admin area (`src/routes/admin.tsx` or a small `src/components/admin/TestEmails.tsx`) listing the four templates from the registry with individual send buttons plus "Send all", with success/error toast feedback.
- Verify with `bunx tsgo --noEmit`, then send one live test to confirm delivery.
