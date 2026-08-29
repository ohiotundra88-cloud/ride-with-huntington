# Bulk Communications: Role- and Tag-Targeted Messaging

Give captains, co-chairs and super users a real messaging tool: compose a message once, target it by role and by individual rider tags, and deliver it in-app to exactly the right people — with a full send history.

## Current state

The notification manager under Super User is demo-only: notifications live in browser state (`admin-store`), so what one person composes nobody else sees, and "audience" is a single dropdown with no role or tag awareness. This plan replaces that with database-backed, targeted messaging.

## What gets built

### 1. Audience targeting engine
Build a saved-audience concept where a message targets any combination of:

- **Roles** — Rider, Volunteer, Captain, Co-Chair, Vendor Captain, Legal, Risk, Compliance, Marketing, Super User (multi-select, from existing roles).
- **Rider tags** — the tags already pulled from Pelotonia and shown on Rider Progress (High Roller, Survivor, Captain, etc.), plus sub-peloton and ride route.
- **Readiness / status filters** — no Rider ID, not registered with Pelotonia, no hotel booked, no bike reserved, below a fundraising threshold, missing shipping address.
- **Individuals** — search and add or exclude specific people by name/email on top of the group rules.

The audience builder shows a **live recipient count and preview list** as you adjust the rules, so you know exactly who receives it before sending.

### 2. Compose and send
- Title, body (rich text-lite: bold, links, line breaks), optional call-to-action button with a link into the app.
- Priority (Info / Important / Urgent) and category (Reminder, Deadline, Event, Fundraising, General).
- Save as draft, schedule for a future date/time, or send now.
- Duplicate a past message to reuse its audience and copy.

### 3. Delivery: in-app inbox
- Messages are stored per recipient, so each person's notification bell shows only their messages with accurate unread counts.
- Full message inbox page for riders, with read/unread state and CTA links.
- Urgent messages surface as a dismissible banner on My Journey.

### 4. Send history and reporting
- Sent-messages list with audience summary, recipient count, send time, and sender.
- Per-message read stats: how many recipients opened it, and a drill-down list of who has and has not read it.
- CSV export of the recipient list and read status.

### 5. Email delivery (important note)
Lovable's built-in email service is intentionally limited to one-recipient, event-triggered messages and does not permit bulk sends to a list, so we cannot blast these messages out as email through the platform. Two practical options, both included:

- **Copy recipients / export** — one click copies the targeted email addresses (or downloads a CSV) so you can paste them into Outlook and send from your Huntington account, keeping the same audience rules.
- **Optional future path** — if you want true automated email later, that needs a dedicated bulk-email service (e.g. Mailchimp or a corporate mail relay); we can wire the audience engine into that as a follow-up.

For now, the messaging itself is fully functional in-app, with email handled via the export handoff.

## Permissions

- **Captains, Co-Chairs, Super Users**: compose and send.
- **Co-Chairs and Super Users**: send to leadership-only audiences and to all roles.
- **Captains**: send to riders/volunteers and their own sub-peloton audiences.
- **Everyone else**: receive only — no access to compose or to the send history.

All checks are enforced server-side on every read and write, not just hidden in the UI.

## Technical notes

- New tables: `messages` (content, audience rules as JSON, status, schedule, sender), `message_recipients` (resolved recipient rows with read state), and `message_audit` (append-only send log). All with RLS + grants: senders scoped by role, recipients can read only their own rows.
- Audience resolution happens in a server function that joins `user_roles`, `profiles`, `participants` and the Pelotonia-derived rider data — the same source Rider Progress already uses — then writes resolved recipient rows at send time so history is immutable.
- Scheduled sends run through a cron-invoked public API route with bearer verification.
- Notification bell and message inbox read from the database instead of local state; the existing demo notification store is retired for participant-facing messages.
- Styling reuses the existing Super User shell, cards, tables and brand tokens; the rider inbox matches My Journey.

## Success criteria

- A captain can select "Riders + High Roller tag + no hotel booked", see the exact count, and send.
- Each recipient sees only their own messages, with correct unread badge.
- Sender can see who has read a message and export the list.
- A rider with no matching role/tag never receives the message and cannot reach it by URL or API.
