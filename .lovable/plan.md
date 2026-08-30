# Hardening PII (names, addresses, phone numbers)

Your site stores real personal data: rider shipping addresses, mobile numbers, emails, plus vendor contracts and W9s. The database rules are already in decent shape — addresses in `participants` are readable only by the row owner or an admin, vendor data is gated by role functions, and file buckets are private. The gaps below are the ones worth closing.

## What to fix

### 1. Close the profile self-escalation gap for real
A user's own profile row can currently be updated without column restrictions. A database trigger already blocks changes to the vendor-access flag, but the permission grant itself is still wide open, so the security scanner (rightly) treats it as a hole and any future trigger change re-opens it.
- Restrict update permission on the profile table to only the columns a person should be able to edit (name, phone, photo, consent, segment/market/manager).
- Keep the existing trigger as a second layer.

### 2. Lock down the public profile-photo endpoint
Anyone who knows or guesses a user ID can fetch that person's photo from `/api/public/avatar/<id>` without signing in.
- Move photo delivery behind sign-in (an authenticated endpoint), keeping the same on-page experience for logged-in users.
- Public-facing surfaces (fundraiser pages) keep working because they don't rely on rider photos.

### 3. Short-lived, non-shareable links for sensitive files
Vendor contracts, W9s and captain documents should never be reachable through a link that keeps working after it's been forwarded.
- Serve them through signed URLs that expire in ~60 seconds, generated only after the server confirms the caller's role.

### 4. Log every bulk export of personal data
Right now a captain, co-chair or super user can export the full roster with home addresses and no record is kept.
- Add an append-only export log capturing who exported, when, how many rows, and which report.
- Show recent export activity on the super-user screen.

### 5. Only show addresses where they're actually needed
Addresses are needed for apparel shipping, not for day-to-day roster browsing.
- Mask addresses in on-screen roster/rider-progress views (city + state only) with a "reveal" action for admins and super users.
- Keep the full address in the export, which is now logged.

### 6. Account-level protections
- Turn on leaked-password protection and a shorter session lifetime.
- Require re-authentication before a super user changes roles or the vendor-dashboard flag.

## Technical notes
- Column-level `GRANT (…) UPDATE ON public.profiles TO authenticated`, replacing the table-wide grant; keep `profiles_own_update` policy and `protect_profile_privileged_columns` trigger.
- Replace `src/routes/api/public/avatar/$userId.ts` with an authenticated server function returning a short-lived signed URL from the private `avatars` bucket; update `useBranding`/profile photo consumers.
- `vendor-files` and `captain-docs` downloads switch from admin-client passthrough to `createSignedUrl(path, 60)` inside role-checked server functions.
- New table `public.pii_export_log` (actor id/email, report key, row count, filters, created_at) with insert via server function only, select for admin/superuser, no update/delete; write to it from the rider-progress and participants CSV export paths.
- Address masking happens server-side in the list payload — unmasked values are only returned by the export path, so hiding is not just a UI concern.
- Auth settings changed through the backend auth configuration, not code.

## Not changing
- Vendor CRM role gating, contacts `internal_only` split, and participant/profile row-level rules — those are already enforced server-side and working.
