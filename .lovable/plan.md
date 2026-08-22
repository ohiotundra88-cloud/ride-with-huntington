# Mini Fundraising Pages with Stripe

Let members create a public fundraising page (raffle, auction, event tickets, sponsorships, or plain donations), collect card payments into the team's central Stripe account, report on results, and track the payout to the designated bank account after the fundraiser closes.

## How it works for people

1. A signed-in member creates a fundraiser page: title, story, cover image, type, goal, close date, and the items being sold (raffle tickets, ticket types, sponsor tiers, auction lots, or open donations).
2. The page starts as a draft and goes through the existing fundraiser approval workflow already in the hub (captain, then legal/risk/compliance/marketing, then co-chair). Nothing can accept money until every stage is approved.
3. Once approved, the organizer publishes it. The page gets a public shareable link with a progress thermometer, supporter list, and a Stripe checkout button.
4. Supporters pay by card. No hub account needed. They pick a quantity or amount, enter name/email, and get a receipt. Raffle purchases create numbered entries; auction lots take bids and only the winner is charged; sponsorships record the tier and logo.
5. The organizer sees a live dashboard: raised to date, number of supporters, ticket/entry counts, and a supporter export.
6. When the close date passes (or the organizer closes it early), the page stops accepting money and moves to "Closed — pending payout."
7. A Co-Chair or Super User reviews closed fundraisers, marks the payout: designated bank account/recipient, amount, date, reference number, and notes. The site records this as an immutable payout entry so every dollar collected is reconciled against a payout.

## Reporting

- Per fundraiser: gross collected, Stripe fees, net, refunds, supporter count, payout status.
- Roll-up dashboard for leadership: total raised across all fundraisers, filterable by season and type, plus a list of closed fundraisers awaiting payout.
- CSV export of supporters/transactions per fundraiser and across all fundraisers.

## Money flow (as decided)

All payments land in the team's own existing Stripe account. Nothing is auto-routed to organizers. After a fundraiser closes, a Co-Chair/Super User initiates the bank transfer outside the hub and records it in the hub, which then shows the fundraiser as reconciled. This avoids per-organizer identity verification entirely.

## Access rules

- Create a draft: any signed-in member.
- Approve: existing approval roles, unchanged.
- Publish/close/edit any fundraiser: organizer (own only), Captain, Co-Chair, Super User.
- Record payouts and issue refunds: Co-Chair and Super User only.
- Public pages: visible to anyone, but only when status is `live` or `closed`. Drafts and rejected pages are never publicly readable.

## Technical section

**Stripe**: uses your existing Stripe account via the bring-your-own-key integration. You'll be prompted for the secret key in a secure modal (it never passes through chat). We also need a webhook signing secret. Card entry uses Stripe Checkout in hosted mode, so no card data ever touches the site.

**Data model** (new tables, all with RLS + grants):
- `fundraisers` — organizer, type (raffle/auction/tickets/sponsorship/donation), title, slug, story, cover image path, goal, currency, open/close dates, status (`draft`/`pending_approval`/`live`/`closed`/`paid_out`/`cancelled`), links to the existing `fundraiser_requests` row for the approval trail, season.
- `fundraiser_items` — sellable lines per fundraiser: label, description, unit price, quantity available, per-order max, sort order. Covers ticket types, raffle bundles, sponsor tiers, and auction lots.
- `fundraiser_orders` — one row per checkout: supporter name/email, amount, quantity, fee, net, Stripe session/payment-intent id, status (`pending`/`paid`/`refunded`/`failed`), item reference, anonymous flag, message.
- `fundraiser_entries` — generated raffle entry numbers per paid order (for the drawing) and auction bid records.
- `fundraiser_payouts` — append-only: fundraiser, gross, fees, net, recipient/bank label, transfer date, reference, recorded_by, notes.
- `fundraiser_audit` — append-only log of status changes, refunds, and payout entries.

**Server side** (TanStack server functions in `src/lib/fundraising-pages.functions.ts` + `.server.ts`):
- Public reads through a publishable-key server client with narrow `TO anon` SELECT policies limited to live/closed fundraisers and safe columns (no supporter emails ever exposed publicly).
- `createCheckoutSession` — server-side price calculation only (never trusts client amounts), inventory check, then Stripe Checkout session creation.
- `POST /api/public/webhooks/stripe` — server route verifying the Stripe signature, then marking orders paid, generating raffle entry numbers, and decrementing inventory. Idempotent on event id.
- Organizer/admin mutations behind `requireSupabaseAuth` with role checks re-verified server-side (same pattern as the Vendor CRM).

**Routes**:
- `/fundraisers` — public directory of live fundraisers.
- `/fundraisers/$slug` — public fundraiser page with checkout.
- `/fundraisers/$slug/thanks` — post-payment confirmation.
- `/my-fundraisers` and `/my-fundraisers/$id` — organizer create/edit/manage dashboard.
- `/admin/fundraising-pages` — leadership roll-up, payout recording, refunds, exports.
- Approval reuses the existing `/admin/approvals` screen and `fundraiser_requests` stage columns.

**Design**: matches the existing hub tokens and card/tab patterns; mobile-first, since most sharing and checkout happens on phones. Public pages get proper title/description/OG tags per fundraiser for link sharing.

## Compliance note worth flagging before launch

Raffles and auctions are regulated gaming/charitable-solicitation activities in Ohio, and taking money on behalf of a corporate team touches tax-receipting rules. The build routes every page through your existing legal/risk/compliance approval stages, but those reviewers should sign off on raffle and auction mechanics specifically (license requirements, ticket disclosures, whether receipts can claim tax deductibility) before the first page goes live.

## Suggested build order

1. Stripe key connection + data model migration + webhook endpoint.
2. Simple donation pages end-to-end (create → approve → publish → pay → report).
3. Raffle tickets and event tickets (inventory, quantities, entry numbers).
4. Sponsorship tiers.
5. Auction lots and bidding (largest piece; only the winner is charged).
6. Payout recording, reconciliation, exports, and the leadership roll-up.
