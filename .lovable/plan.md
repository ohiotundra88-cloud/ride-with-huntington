# Team Events: Targeted Company Events with RSVP on My Journey

Add a company/team events tool that is separate from the existing Fundraising Events calendar. Captains, admins and super users create an event, target it to specific people using the same audience builder already used for Team Messages, and each targeted person sees it in a new Events box on My Journey with an RSVP.

## What gets built

### 1. Events box on My Journey
- New card on My Journey listing the next 3 upcoming events assigned to me: date, time, title, location, and a link to full details.
- Each event has an RSVP: "I'm in" / "Can't make it" / (no answer yet). One tap to answer, changeable until the event date.
- Empty state: "No team events assigned to you right now."
- A "View all events" link opens a full assigned-events page with past events collapsed.

### 2. Create and assign an event
Accessible to Captain, Admin and Super User only.
- Fields: title, description, date, start/end time, location (or virtual link), organizer name/email, optional flier/attachment.
- Audience: the exact same targeting UI as Team Messages — roles, participation, Pelotonia tags, sub-peloton, route, readiness gaps, plus include/exclude specific individuals — with the live recipient count and preview list.
- Same role limits as messaging: captains cannot target leadership-only roles; co-chairs, admins and super users can target everyone.
- Save as draft or publish. Publishing resolves the audience and writes immutable assignment rows, so later roster changes do not silently change who was invited.

### 3. Automatic notification
- Publishing an event automatically sends an inbox message to exactly the matched audience, with the event title, date/location and a call-to-action link to the event, using the existing messaging delivery path.

### 4. Organizer view and RSVP reporting
- Event list for organizers: upcoming/past, audience summary, invited count, and RSVP tallies (in / out / no reply).
- Drill-down list of who replied what, with CSV export.
- Edit an event; re-publishing after an audience change adds newly matched people without disturbing existing RSVPs. Cancel an event notifies invitees.

## Permissions

- Captain, Admin, Super User: create, edit and publish events.
- Super User: additionally delete events.
- Everyone else: sees only events assigned to them, and only their own RSVP.

All checks are enforced server-side on every read and write, so a non-invited user cannot reach an event by URL or by calling the API directly.

## Technical notes

- New tables: `team_events` (content, audience JSON, status draft/published/cancelled, organizer, timestamps), `team_event_invitees` (resolved user rows with `rsvp` = yes/no/null and `responded_at`), `team_event_audit` (append-only publish/edit/cancel log). Each with GRANTs and RLS: organizers scoped by role via a new `can_manage_team_events(_user_id)` function covering captain/admin/superuser/cochair; invitees may read their own invite row and update only their own `rsvp`.
- Audience resolution reuses `buildAudienceRoster` / `resolveAudience` / `assertAudienceAllowed` from `src/lib/messages.server.ts` unchanged, so targeting semantics stay identical to messaging.
- New `src/lib/team-events.shared.ts` (types + validation) and `src/lib/team-events.functions.ts` (list mine, list manageable, preview audience, save, publish, cancel, set RSVP, list invitees/RSVP export), all behind `requireSupabaseAuth`.
- Publishing calls the existing message pipeline to create and deliver the announcement, so the inbox, unread badge and read tracking work with no new delivery code.
- New route `src/routes/team-events.tsx` (organizer console, styled on the existing Team Messages screen) and `src/routes/my-events.tsx` (assigned events + RSVP), plus a `MyEventsCard` component on the My Journey dashboard.
- Attachments reuse the private storage + signed-stream pattern already used for event fliers.
- Existing `/events` fundraising calendar is untouched.

## Success criteria

- A captain targets "Riders + sub-peloton A", sees the count, publishes, and only those people get the event and an inbox notice.
- A rider sees the event in the My Journey box, RSVPs, and the organizer sees the tally.
- A non-invited user cannot load the event by URL or API.
