# Fundraiser Approval Workflow + Permanent Roster Roles

Replace the SharePoint approval process with an in-app request → review → publish flow, add the reviewer roles admins can appoint, and make super-user-created records survive the end-of-season reset.

## 1. New reviewer roles

Add these appointable roles alongside the existing admin/captain: `legal`, `risk`, `compliance`, `marketing`, `cochair`, plus `superuser`.

- Admins appoint/revoke reviewers by email on the existing `/admin/users` page (one tab or card per role, matching how Captains work today).
- Only a super user can grant or revoke `superuser`.
- Role grants are never removed by the season reset — only by explicit revocation.

## 2. Fundraiser approval requests

Participants submit a request from the Events area:

- Event info: title, description, date, times, location, expected attendance, fundraising method, contact name/email/phone.
- Event type: **In-person event** or **Virtual / non-physical** (raffle, online auction, etc.).
- Flier attachment (reuses the existing private flier storage + same-origin streaming proxy so it works on VPN).

Approval flow (per the chosen model):

```text
Submitted -> Captain review -> [ Legal | Risk | Compliance | Marketing ] (any order) -> Co-chair sign-off -> Approved
                  |                        |                                                |
                  +-- Changes requested / Declined at any stage (with a note) --------------+
```

- Each stage records who acted, when, the decision, and an optional comment — shown as a visible approval trail on the request.
- Reviewers see a queue of only the requests waiting on them, with badge counts.
- Submitter can edit and resubmit while in "Changes requested".

Calendar visibility:

- **In-person events** appear on the public fundraising calendar only after final co-chair approval.
- **Virtual / non-physical events** appear once the captain approves, badged "Pending final approval" until fully signed off.
- Submitters, their captain, reviewers, and admins always see their own/queued requests regardless of status.

## 3. Manually added participants (super user)

A super user can add a participant directly:

- Enter Huntington email + name (and optional role designations); the account is created immediately so the person can sign in with that email — no invite email needed.
- Rows are flagged as manually created and season-persistent: the season reset never touches them.
- Super user can also manually deactivate/remove a manually added participant.

## 4. End-of-season reset tool

A guarded action in super user admin (type-to-confirm) that:

- Clears rider/volunteer registration progress and season-specific participant data.
- Preserves: all role grants, manually added participants, approval-request history, FAQs, resources, and events archive.
- Writes an entry to the existing audit log.

## Technical notes

- Migration: extend `app_role` enum with the new roles; new tables `fundraiser_requests` (event fields, `event_type`, `status`, `submitted_by`, links to a published `events` row) and `fundraiser_approvals` (request_id, stage, decision, actor, note, timestamps). GRANTs + RLS per table: submitter reads own, reviewer role reads/acts on its stage via `has_role`, admins full access; anon reads nothing.
- Reuse `roles-admin.server.ts` (`grantRole`/`revokeRole`/`listMembersOfRole`) generically for each new role, adding a super-user assertion for `superuser` grants.
- Server functions in `src/lib/fundraiser-requests.functions.ts`: submit, update, list-mine, list-queue, decide (stage-gated server-side), publish-to-calendar on completion.
- Manual participant creation uses the Supabase admin API in a server function that first verifies the caller holds `superuser`; participant rows get `manual_entry boolean` + `season_locked boolean`.
- New routes: `/events/request` (submit + my requests), `/admin/approvals` (queue), plus tabs on `/admin/users` and a Reset panel on `/admin/index`.
- Participant/registration data gets a `season` label so the reset targets only the current season.
