# Switch for the Fundraiser Pages

Add a Super User switch that turns the fundraiser pages (donate / sign up / browse) on and off site-wide, without touching the fundraiser request and approval workflow.

## What the switch controls

Off means:

- The public fundraiser list and every individual fundraiser page show a friendly paused notice ("Fundraiser pages are paused right now") with a link back home — no donate button, no sign-up, no checkout.
- Checkout and receipt actions are refused on the server, so an old link, a bookmarked page or a direct API call can't take money while it's off.
- "Fundraisers" and "My Fundraisers" disappear from the navigation, and My Fundraisers (including the detail/editing views) shows the same paused notice.

Off does NOT touch:

- Submitting a fundraiser request.
- The approval flow, approver queues, pizza-tracker status, or Super User approval admin.
- Any existing fundraiser data, orders, entries, payouts, or history — nothing is deleted or unpublished, it's just hidden until switched back on.

## Where the switch lives

A single toggle on the Super User feature flags page ("Fundraiser pages — public donate and sign-up pages"), with a short note that requests and approvals keep working. Only Super Users can flip it; the value is stored in the database so it applies to everyone instantly, not just the person who flipped it.

Every flip is written to the audit trail (who, when, on or off).

## Technical notes

- New singleton table `public.site_settings` (id = 1, `fundraiser_pages_enabled boolean not null default true`, `updated_at`, `updated_by`) with grants + RLS: readable by `anon` and `authenticated`, writable only when `is_superuser(auth.uid())`. Trigger `set_updated_at`. This is a real server-side setting, unlike the existing client-side `admin-store` flags.
- New `src/lib/site-settings.functions.ts`: `getSiteSettings` (public, server publishable client so signed-out visitors and SSR can read it) and `setFundraiserPagesEnabled` (behind `requireSupabaseAuth`, re-checks `is_superuser` and writes an audit row).
- Server enforcement in `src/lib/fundraising-pages.server.ts` / `fundraising-pages.functions.ts`: a `assertFundraiserPagesEnabled()` guard at the top of `listPublic`, `getPublic`, `startCheckout`, `getOrderReceipt`, `listMyFundraisers`, `getFundraiserDetail`, `saveFundraiserPage`, and the flier/payout/draw actions. Request + approval functions (`submitFundraiserForApproval`, `getFundraiserApproval`, everything in `fundraiser-requests.functions.ts`) are deliberately left unguarded.
- New `src/components/FundraiserPagesPaused.tsx` notice, rendered by `fundraisers.index.tsx`, `fundraisers.$slug.index.tsx`, `fundraisers.$slug.thanks.tsx`, `my-fundraisers.index.tsx` and `my-fundraisers.$id.tsx` when the setting is off; each route reads the setting through a shared `useSiteSettings()` query.
- `src/components/AppNav.tsx` hides the `/fundraisers` and `/my-fundraisers` links (and drops `/fundraisers` from the guest-allowed list) when off; the fundraiser-request link stays.
- Flags page gains the toggle in a small "Site switches" card above the existing client-side flags, wired to the new server function with an optimistic switch and toast.

## Verification

After building: flip the switch off, confirm the public list, a fundraiser slug page and My Fundraisers all show the paused notice, that the nav links are gone, and that the fundraiser request form plus the approvals queue still work; then flip it back on and confirm everything returns.
