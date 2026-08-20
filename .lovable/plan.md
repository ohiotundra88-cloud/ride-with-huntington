# Vendor CRM Module

A new, tightly gated area of the hub for tracking Team Huntington vendor relationships, spend, and donations — matching the existing hub branding and mobile-first layout.

## Access model

New role: **Vendor Captain**, appointed like the existing reviewer roles.

Who gets in:
- Vendor Captain **and** their profile flag `has_vendor_dashboard_access` is on
- Co-Chair (always, flag not required)
- Super User (always, plus destructive powers)

Only a Super User can turn `has_vendor_dashboard_access` on or off. Everyone else — riders, volunteers, captains, legal, risk, compliance, marketing, plain admins — sees no navigation entry and is refused by the server if they try a direct URL.

Permissions inside the module:

| Action | Vendor Captain | Co-Chair | Super User |
| --- | --- | --- | --- |
| View all vendors (shared pool) | yes | yes | yes |
| Create / edit vendors, contacts, spend, donations, activity, attachments | yes | yes | yes |
| Archive vendor / attachment | no | yes | yes |
| Permanently delete (archived only) | no | no | yes |
| Toggle dashboard access flag | no | no | yes |

Security is enforced in the database, not the browser: every vendor table gets row-level policies driven by a single security-definer function that re-checks role + flag on every read and write. Files live in a private bucket streamed through an authorization-checking endpoint, so attachment URLs are not guessable or shareable outside the allowed group.

## Data model

- `vendors` — business name, status (Active/Prospect/Inactive), business segment, internal business segment, relationship owner, secondary owner, internal notes, primary contact name + phone, general notes, archived flag/by/at, created/updated by + timestamps
- `vendor_contacts` — up to 10 additional contacts per vendor (name, email, title, phone)
- `vendor_spend` — one row per vendor per year: year (integer, with a "Beyond" bucket), amount, notes
- `vendor_donations` — one row per vendor per year: year, committed amount, actual donated, recipient, notes. Outstanding commitment is always calculated, never stored.
- `vendor_activity` — touchpoint log: date, contacted by, method (Phone/Email/In-Person/Video Call/Other), notes, next step
- `vendor_attachments` — file metadata, uploader, upload date, archived flag
- `vendor_audit` — append-only history: created, edited (with changed field names), archived, restored, attachment uploaded, attachment deleted. No updates or deletes permitted, even for Super Users.
- `profiles.has_vendor_dashboard_access` — boolean, default false

Years are rows, so adding 2028 later needs no schema change — the UI renders whatever years exist plus the standard 2024–2027 + Beyond columns.

## Screens

**Executive dashboard** (top of module, year filter defaulting to the current year): total vendor spend, total donations received, total commitments, outstanding commitments, donation-to-spend ratio, active vendor count, donating vendor count, and a "spend but no donation" count that links straight to that filtered list.

**Vendor list**: search by business name; filters for status, business segment, year with activity, and an Archived tab; sorting by name, status, segment, last modified, total spend, total donated, and support rate (highest and lowest); a quick filter for high-spend / zero-donation vendors; and a CSV export of the current filtered set with contacts and year data flattened into columns.

**Vendor detail**: summary header with rollups (total spend, committed, donated, outstanding, fulfillment %, support rate) and prominent "Last Modified By / Date", the most recent activity entry with a "view full history" expander, a year-by-year tab/table view for spend and donations, additional contacts, attachments with name/uploader/date/download, and a link to the full audit log.

**Create / edit vendor**: single mobile-friendly form. Before saving a new vendor, a near-match check on business name warns "A vendor named 'X' already exists — are you sure?" with a confirm-anyway option. Validation: business name required, primary contact required, valid email and phone formats, non-negative amounts.

**Super User access screen**: extends the existing Admins & Super Users page with a Vendor Captains card — appoint/revoke the role by email (same pattern as other roles) and a per-person toggle for vendor dashboard access.

## Technical notes

- Migration adds `vendor_captain` to the `app_role` enum, the seven vendor tables with GRANTs + RLS, `profiles.has_vendor_dashboard_access`, `updated_at` triggers, and security-definer helpers `can_view_vendors`, `can_archive_vendors`, `can_purge_vendors`, plus a private `vendor-files` storage bucket with owner-group policies.
- Server functions in `src/lib/vendors.functions.ts` (+ `vendors.server.ts`, `vendors.shared.ts`) all use `requireSupabaseAuth` and re-assert authorization before touching data; rollups are computed in SQL views for list sorting.
- Attachment downloads go through `src/routes/api/vendor-file/$id.ts` — an authenticated (non-public) route that validates the bearer session and role before streaming, keeping VPN-friendly same-origin delivery.
- Routes: `src/routes/vendors.tsx` (dashboard + list), `vendors.$id.tsx` (detail), `vendors.new.tsx`, all wrapped in a gate component that also fails closed on the server. Nav entry appears only for permitted roles.
- Audit rows are written inside the same server functions that mutate data, with field-level diffs for edits.
