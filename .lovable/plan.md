## Problem

On My Journey (`/dashboard`), the readiness cards (Pelotonia, Hotel, Bike, Volunteer, Apparel, Fundraising) are rendered from seeded demo content in `src/lib/mock-data.ts` via `src/lib/admin-store.tsx` — they never read the user's actual registration. The Bike card is hard-coded to `action_needed` with "Reserve or confirm your rental before Jul 22", so selecting "I don't need a bike" in the wizard has no effect.

## Fix

Overlay the live registration state from `useStore()` onto the readiness cards in `src/routes/dashboard.tsx`, presentation-only — the seeded card stays as the fallback whenever the participant hasn't answered that step yet.

Mapping (only applied when the participant has made a selection):

- **Bike**
  - `needs === "no"` → status Complete, detail "Bringing your own bike — no rental needed.", CTA "Update bike plan"
  - `needs === "yes"` and step complete → Reserved, detail summarizing size/type
  - `needs === "yes"` and incomplete → Action needed
  - `needs === "unsure"` → In progress
  - Volunteer-only participants → Not applicable
- **Pelotonia** — Complete when the Pelotonia step is complete (show confirmation code if entered), In progress when pending
- **Hotel** — from the travel step: Reserved when complete, In progress when pending, Action needed when travel is required but not started
- **Apparel** — Ordered when the apparel step is complete, In progress when pending
- **Volunteer** — Not applicable for riders, In progress/Complete for volunteer or both
- **Fundraising** — untouched (API-managed sample data)

The header readiness percentage keeps using `readinessScore`, now computed from the merged statuses so the ring matches the cards.

Cards not backed by a wizard step, plus any card an admin has unpublished or deactivated, behave exactly as today.

## Technical notes

- Change is confined to `src/routes/dashboard.tsx`: a `useMemo` that maps `state.readiness` through the `registration` object from `useStore()` before filtering/sorting.
- No schema, server function, or admin-store changes; Super User edits to titles, CTAs, ordering, and publish state still apply — only `status` and `detail` are derived when live data exists.
