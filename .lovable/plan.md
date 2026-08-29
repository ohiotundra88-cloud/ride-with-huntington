# Recommended Next Addition: Pelotonia Sync & Admin Data Health

Based on your priorities — **admin efficiency** first, with **deeper Pelotonia API sync**, serving **riders and leaders** — the highest-impact next build is an automated Pelotonia sync layer plus a data-health dashboard for captains/co-chairs.

## Why this first

Right now the app relies on manual Rider ID entry and live API calls on page load. Captains and super users spend time chasing down who has registered, who is missing a Rider ID, whether Pelotonia route/sub-peloton data matches the app, and whether fundraising totals reconcile. A sync layer turns that into a 30-second review instead of hours of spreadsheet work.

## What we would build

### 1. Pelotonia sync table + scheduled sync
- New `pelotonia_sync` table storing the latest Pelotonia snapshot per rider (raised, goal, commitment, route, sub-peloton, registration status, last synced at).
- Nightly/scheduled background sync via a public `/api/public/sync-pelotonia` route invoked by a Lovable Cloud cron job.
- Server-side merge logic that matches Pelotonia riders to app participants by Rider ID and surfaces unmatched records.

### 2. Admin Data Health dashboard
- New Super User / Captain view at `/admin/data-health`.
- Cards showing:
  - App participants with no matching Pelotonia rider
  - Pelotonia riders not found in the app
  - Missing Rider IDs
  - Fundraising total discrepancy between app and Pelotonia
  - Riders missing hotel / bike / jersey info
- One-click "Remind rider" or "Copy missing Rider ID" actions.

### 3. Enrichment of existing surfaces
- Rider Progress and admin participants screens pull from the synced snapshot so they load instantly and work offline/VPN.
- "Last synced" timestamp shown on dashboard and rider progress.
- Auto-fill route, sub-peloton, and high-roller/survivor flags from Pelotonia where the API exposes them.

### 4. Audit and controls
- Sync log table (`pelotonia_sync_runs`) with run time, rows changed, errors.
- Manual "Sync now" button for Super Users.
- Toggle to pause auto-sync in `/admin/flags`.

## Out of scope for this plan

- Real-time Pelotonia push webhooks (Pelotonia does not expose them; polling is the practical approach).
- Stripe/live payment integration — recommended as the **next follow-up** once sync is stable.
- Bulk email sending outside the existing notification system.

## Technical notes

- Uses `createServerFn` and a TanStack server route (`/api/public/sync-pelotonia`) for the cron endpoint.
- Cron route verifies a bearer token via the generated `authenticateCronRequest` helper.
- Adds two new `public` tables with RLS + GRANTs following the existing pattern.
- Snapshot data is read-only for riders; leaders get the data-health view.
- No Supabase Edge Functions; everything runs through TanStack Start server functions.

## Success criteria

- Super Users can click "Sync now" and see matched/unmatched counts within seconds.
- Captains/Co-Chairs see the Data Health dashboard and can identify missing Rider IDs without leaving the app.
- Rider Progress loads from the synced table and still reflects live fundraising figures (refreshed by the sync job).
- A failed sync run is visible in the log and does not silently leave stale data.

## Follow-up options after this

1. **Stripe-powered mini-fundraising pages** — turn the demo fundraising module into live donation pages with receipts and payout tracking.
2. **Bulk communications** — automated, segmented reminders to riders based on readiness gaps (no hotel, no bike, no fundraising, etc.).
3. **Vendor CRM → donation pipeline** — link vendor spend/donations directly to fundraising totals and vendor recognition pages.
