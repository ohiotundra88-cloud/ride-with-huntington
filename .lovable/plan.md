# Pizza-Tracker Status Bar for Fundraiser Approvals

Replace the plain two-column stage checklist with a horizontal "order tracker" bar — the
Donatos/Domino's pattern — so a submitter can see at a glance exactly where their fundraiser
request sits and what happens next.

## What the tracker looks like

Four visual phases across one connecting rail, in the real order of the workflow:

```text
 ●━━━━━━━━━━●━━━━━━━━━━◐╌╌╌╌╌╌╌╌╌╌○
Submitted   Captain    Department   Co-Chair      →  On the calendar
                       Review (2/4)  Sign-off
```

- The rail fills with Huntington bright green up to the current phase; remaining track is light gray.
- Completed phases: filled green dot with a check. Current phase: pulsing ring. Upcoming: hollow gray dot.
- The **Department Review** phase covers Legal, Risk, Compliance and Marketing (they approve in any
  order), so it shows a `2 of 4 cleared` count plus four small chips underneath — each chip turns green
  when that team signs off.
- Under the bar, one plain-language status line: e.g. "Your captain approved — now with Legal, Risk,
  Compliance and Marketing." / "Fully approved — your event is live on the fundraising calendar."
- Exception states recolor the bar instead of faking progress: **changes requested** turns the current
  phase amber with "Sent back for changes by Legal", **declined** turns it red and stops the rail.
- A relative timestamp of the last movement ("updated 2 days ago").

Mobile-first: on narrow screens the rail becomes a vertical timeline with the same dots, labels and
chips so nothing is clipped; it switches to the horizontal bar at `sm:` and up.

## Where it appears

- **/fundraiser-request** — inside each of "My requests" cards, replacing the current 2-column stage list.
  This is the main audience for the tracker.
- **/admin/approvals** — same component at the top of each review card, so reviewers see the whole journey
  and which teams are still outstanding (the existing per-stage decision buttons stay as they are).

## Technical notes

- New component `src/components/ApprovalTracker.tsx`, driven purely by an existing `FundraiserRequest`
  object — no new server functions, database columns, or queries.
- Phase derivation is a small pure helper added to `src/lib/fundraiser-requests.shared.ts`
  (`trackerPhases(request)`), reusing the existing `STAGES`, `stageStatus`, and `actionableStages`
  logic so the tracker can never disagree with who can act next.
- Styling uses existing brand tokens (`--brand`, `--brand-dark`, muted/destructive) — no hardcoded colors.
- `src/routes/fundraiser-request.tsx` and `src/routes/admin.approvals.tsx` swap their stage grids for
  `<ApprovalTracker request={r} />`; the shared `StageIcon` helper stays for the chips.
