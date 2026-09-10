# Turn on email for event invites and approval decisions

Today only a Team Message sends email, and only when the sender ticks the email box (unticked by default). Event invites/cancellations and fundraiser approval decisions appear only in the site's bell and inbox. This adds email to those two, and pre-ticks the email box on Team Messages.

## 1. Team Messages: email on by default

The "Also email this to recipients" box starts ticked when composing a new message. Everything else stays: the sender can untick it, exclude individual people, and anyone who opted out of email or previously bounced is skipped automatically.

## 2. Event invites and cancellations by email

When an event is published, every invited person gets an in-app notice (as today) plus an email with:

- Event title, date, time and location
- The description and organiser name
- A button to open the event and RSVP

When an event is cancelled, invitees get a clearly-marked cancellation email with the original when/where.

The email respects the same rules as team messages: people who turned email off in their profile are skipped, and delivery outcomes show in the email log.

## 3. Fundraiser approval decisions by email

The submitter gets one email per decision on their request:

- Approved by a reviewer, and a separate "fully approved" note when every reviewer has signed off
- Denied / needs attention, including the reviewer's comment and a button to edit and resubmit
- Changes requested, same shape

Only the submitter is emailed — reviewers keep working from the approvals screen.

## Notes on limits

- Emails come from the already-verified `ridewithhuntington.com` sender, so nothing new is needed from you.
- Lovable appends an unsubscribe footer to every one of these emails and it cannot be switched off per message. Someone who unsubscribes there stops receiving all app email, but sign-in and password-reset emails keep working.
- Nothing is sent for readiness/progress reminders — those stay in-app.

## Technical notes

- New React Email templates in `src/lib/email-templates/`: `event-invitation.tsx`, `event-cancelled.tsx`, `fundraiser-decision.tsx`, registered in `registry.ts`, styled from `brand.ts` like `team-announcement.tsx`.
- `src/lib/team-events.server.ts`: after `notifyPeople` writes recipient rows, a new `emailPeople` helper batches `sendTemplateEmail` (batches of 5, per-recipient try/catch, `idempotencyKey` = event id + action + user id), skipping recipients whose `profiles.email_opt_out` is true. Called from both publish and cancel paths in `team-events.functions.ts`.
- `src/lib/fundraiser-requests.functions.ts`: after a decision is recorded, look up the submitter's email/name and send `fundraiser-decision` with stage label, decision, comment, and a `/fundraiser-request` CTA; keyed by request id + stage + decision so retries don't duplicate. Failures are logged, never blocking the decision write.
- `src/routes/messages.tsx`: `useState(true)` for `emailNotify` on new composes; loading a draft still restores its saved value.
- No schema changes, no queue, no cron.
