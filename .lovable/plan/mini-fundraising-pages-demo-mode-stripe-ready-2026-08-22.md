# Mini Fundraising Pages (Demo Mode, Stripe-Ready)

Let members create a public fundraising page (raffle, auction, event tickets, sponsorships, or plain donations), take "payments" through a simulated checkout, report on results, and track the payout to a designated bank account after the fundraiser closes.

No Stripe account is needed for this build. Every piece of the experience is real except the card charge itself, which runs through a clearly labeled demo checkout. When you're ready for real money, we swap one module and the rest of the app is untouched.

## How it works for people

1. A signed-in member creates a fundraiser page: title, story, cover image, type, goal, close date, and the items being sold (raffle tickets, ticket types, sponsor tiers, auction lots, or open donations).
2. The page starts as a draft and goes through the existing fundraiser approval workflow already in the hub (captain, then legal/risk/compliance/marketing, then co-chair). Nothing can accept money until every stage is approved.
3. Once approved, the organizer publishes it. The page gets a shareable link with a progress thermometer, supporter list, and a checkout button.
4. A supporter picks a quantity or amount, enters name/email, and completes the demo checkout. A prominent "Demo — no real payment is processed" banner sits on the page and the confirmation screen. Raffle purchases create numbered entries, auction lots take bids with only the winner charged, sponsorships record the tier.
5. The organizer sees a live dashboard: raised to date, supporter count, ticket/entry counts, and a supporter export.
6. When the close date passes (or the organizer closes it early), the page stops accepting orders and moves to "Closed — pending payout."
7. A Co-Chair or Super User records the payout: recipient/bank label, amount, date, reference number, notes. That entry is immutable, so every dollar collected is reconciled against a payout.

## Demo checkout, in plain terms

The checkout button opens an in-app payment step that looks and behaves like a real one — order summary, fee line, supporter details, confirmation, receipt email content shown on screen — but it marks the order paid instantly instead of charging a card. Amounts are still calculated on the server from the fundraiser's real prices, inventory still decrements, and refunds still work as status changes. So all the reporting, roll-ups, raffle drawings, and payout reconciliation are exercised with realistic data.

We'll also add a "seed demo supporters" button for leadership so a page can be shown to stakeholders with believable traffic.

## Reporting

- Per fundraiser: gross collected, estimated processing fees, net, refunds, supporter count, payout status.
- Leadership roll-up: total raised across all fundraisers, filterable by season and type, plus closed fundraisers awaiting payout.
- CSV export of supporters/transactions per fundraiser and across all fundraisers.

## Access rules

- Create a draft: any signed-in member.
- Approve: existing approval roles, unchanged.
- Publish/close/edit any fundraiser: organizer (own only), Captain, Co-Chair, Super User.
- Record payouts and refunds: Co-Chair and Super User only.
- Public pages: readable by anyone, but only when status is `live` or `closed`. Drafts, pending, and rejected pages are never publicly readable, and supporter emails are never exposed publicly.

## Technical section

**Payment abstraction**: a single `PaymentProvider` interface in `src/lib/payments/` with two methods (`createCheckout`, `refund`) and a webhook-shaped completion handler. Ship a `DemoProvider` now; a `StripeProvider` gets added later behind the same interface plus a `/api/public/webhooks/stripe` signature-verified route. No route, table, or component changes needed at that point — the order table already carries `provider`, `provider_session_id`, and `provider_payment_id` columns (null/`demo_*` in demo mode).

**Data model** (new tables, RLS + grants in the same migration):
- `fundraisers` — organizer, type (raffle/auction/tickets/sponsorship/donation), title, slug, story, cover image path, goal, currency, open/close dates, status (`draft`/`pending_approval`/`live`/`closed`/`paid_out`/`cancelled`), `is_demo` flag, link to the existing `fundraiser_requests` row for the approval trail, season.
- `fundraiser_items` — sellable lines: label, description, unit price, quantity available, per-order max, sort order. Covers ticket types, raffle bundles, sponsor tiers, auction lots.
- `fundraiser_orders` — supporter name/email, amount, quantity, fee estimate, net, status (`pending`/`paid`/`refunded`/`failed`), item reference, provider columns above, anonymous flag, message.
- `fundraiser_entries` — raffle entry numbers generated per paid order, plus auction bid records.
- `fundraiser_payouts` — append-only: gross, fees, net, recipient/bank label, transfer date, reference, recorded_by, notes.
- `fundraiser_audit` — append-only log of status changes, refunds, payouts, and demo seeding.

**Server side** (`src/lib/fundraising-pages.functions.ts` + `.server.ts`):
- Public reads via a publishable-key server client with narrow `TO anon` SELECT policies limited to live/closed rows and safe columns.
- `createOrder` recalculates every amount server-side from the fundraiser's stored prices and checks inventory — it never trusts a client-sent total, so the demo logic stays correct when a real provider is dropped in.
- Organizer/admin mutations behind `requireSupabaseAuth` with server-side role re-verification, same pattern as the Vendor CRM.

**Routes**:
- `/fundraisers` — public directory of live fundraisers.
- `/fundraisers/$slug` — public page with checkout and demo banner.
- `/fundraisers/$slug/thanks` — confirmation/receipt view.
- `/my-fundraisers`, `/my-fundraisers/$id` — organizer create/edit/manage dashboard.
- `/admin/fundraising-pages` — leadership roll-up, payouts, refunds, exports, demo seeding.
- Approval reuses `/admin/approvals` and the existing `fundraiser_requests` stage columns.

**Design**: existing hub tokens and card/tab patterns, mobile-first, per-fundraiser title/description/OG tags for link sharing.

## What's needed to go live later

1. A Stripe account for the entity that will legally hold the funds (Huntington team entity or the charity), including bank details and identity verification.
2. Your Stripe secret key and a webhook signing secret saved as project secrets.
3. Add `StripeProvider` and the webhook route, flip the provider setting, and clear demo orders.
4. Legal/risk/compliance sign-off on raffle and auction mechanics — these are regulated gaming and charitable-solicitation activities in Ohio, and receipting/tax-deductibility language needs review before real money moves.

## Suggested build order

1. Data model migration + payment abstraction + demo provider.
2. Simple donation pages end-to-end (create → approve → publish → demo pay → report).
3. Raffle tickets and event tickets (inventory, quantities, entry numbers, drawing).
4. Sponsorship tiers.
5. Auction lots and bidding (largest piece; only the winner is charged).
6. Payout recording, reconciliation, exports, leadership roll-up, demo seeding.
