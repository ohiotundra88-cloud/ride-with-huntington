# Pick your captain when submitting a fundraiser request

Let the person submitting a fundraiser request choose, from a dropdown, which peloton captain
should review it first. Everything after that keeps working exactly as it does today.

## What changes for the submitter

- On the fundraiser request form, a new required field: **Which captain should approve this?**
- The dropdown lists every colleague who holds the Captain designation, showing their name and
  email, sorted by name.
- The chosen captain is shown on the request card and in the approval trail ("Waiting on
  Jane Smith to review the details").
- When the request is submitted (or resubmitted after changes), the chosen captain gets the
  request in their review queue and an email letting them know it is waiting on them.
- If the submitter edits and resubmits, they can also change which captain it goes to.

## What changes for reviewers

- Captains only see requests assigned to them in their approval queue, instead of every
  request in the company.
- Only the assigned captain (plus admins and super users, as today) can act on the captain
  stage. Legal, Risk, Compliance, Marketing and Co-Chair reviewers are unaffected and still
  see everything at their stage.
- The decline / "needs updated" behaviour is untouched: a comment is still required, the
  request still drops to "Denied — needs attention" or "Changes requested", the submitter can
  still edit and resubmit, and resubmission still resets the later stages.

## Order of approvals (unchanged)

```text
Submitted -> Chosen Captain -> [ Legal | Risk | Compliance | Marketing ] -> Co-Chairs -> Approved
```

## Technical notes

- Migration: add nullable `captain_id uuid references auth.users(id)` to
  `public.fundraiser_requests` (nullable so existing rows and the deployed app keep working);
  index on `(captain_id, status)`. Regenerate database types afterwards.
- New server function `listCaptainOptions` in `src/lib/fundraiser-requests.functions.ts`:
  requires auth (any signed-in colleague), loads `user_roles` where role = 'captain' via the
  admin client, joins `profiles` for name/email, returns `{ user_id, full_name, email }[]`.
  No admin assertion — submitters need it.
- `requestInputSchema` in `fundraiser-requests.shared.ts` gains `captain_id: z.string().uuid()`
  (required for new submissions); `FundraiserRequest` and `REQUEST_COLUMNS` gain `captain_id`
  plus optional `captain_name` / `captain_email` hydrated for display.
- `saveMyRequest` persists `captain_id` on insert and update, and after a successful save emails
  the assigned captain (reuse the `fundraiser-decision`-style send path with a new
  `fundraiser-request-assigned` template, idempotency key `fr-assigned-<id>-<updated_at>`,
  respecting `email_opt_out`; failures logged, never blocking the save).
- `decideOnRequest`: for `stage === "captain"`, require `context.userId === request.captain_id`
  unless the caller holds `admin` or `superuser`. Extend `canActOnStage` with an optional
  request argument so the UI hides buttons for captains who aren't assigned.
- `listReviewRequests`: keep returning all rows for department/co-chair/admin roles, but for a
  caller whose only reviewer role is `captain`, filter to `captain_id = userId`; hydrate captain
  name/email alongside the existing submitter hydration.
- RLS: extend the existing reviewer SELECT policy so an assigned captain can read their own
  requests; department and co-chair policies unchanged.
- UI: dropdown (shadcn `Select`) in `src/routes/fundraiser-request.tsx` above the flier field,
  captain name surfaced on request cards and in `src/routes/admin.approvals.tsx`; tracker
  message in `trackerPhases` uses the captain's name when available.
