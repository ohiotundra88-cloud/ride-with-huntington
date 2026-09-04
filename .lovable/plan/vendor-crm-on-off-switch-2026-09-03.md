# Vendor CRM on/off switch

Add a second site switch, next to the fundraiser-pages one, that turns the Vendor CRM tool off for everyone except Super Users. Only Super Users can flip it.

## Behavior

When the switch is **off**:
- The "Vendor CRM" nav link disappears for vendor captains, co-chairs, and everyone else.
- Opening a vendor page directly shows a friendly notice: the tool is paused, nothing has been deleted, and it will return when switched back on.
- All vendor reads and writes are refused server-side, so a stale browser tab or a direct call cannot slip through.

**Super Users are exempt**: the nav link stays, vendor pages open normally, and vendor records remain fully usable for them while the tool is hidden from everyone else.

The Super User card for granting and revoking vendor dashboard access stays visible either way, so access can be lined up before switching the tool back on.

When the switch is **on**, everything behaves exactly as it does today — existing role and access rules are unchanged.

## Where the switch lives

Admin → Feature flags → "Site switches (apply to everyone)", directly beneath the fundraiser-pages switch:

- **Vendor CRM** — "Vendor relationship tracking, spend, and donations. Switching this off hides the tool from everyone except Super Users; no vendor records are deleted."

Flipping it saves immediately, shows a confirmation toast, and is written to the audit log like the fundraiser switch.

## Technical notes

- Add `vendor_crm_enabled boolean NOT NULL DEFAULT true` to the existing singleton `public.site_settings` row (same grants and Super-User-only update policy already in place).
- Extend `SiteSettings` in `src/lib/site-settings.shared.ts` with `vendorCrmEnabled`, read it in `readSiteSettings()`, and add `setVendorCrmEnabled` to `src/lib/site-settings.functions.ts` guarded by the `is_superuser` RPC (same shape as `setFundraiserPagesEnabled`).
- In `src/lib/vendors.server.ts` (or the shared access check the vendor functions already call), refuse when the switch is off unless the caller is a Super User — a single gate inside the existing access assertion covers every vendor server function, including attachments and activity logging.
- `getVendorAccess` returns `allowed: false` for non-Super-Users while off, so `useVendorAccess()` already hides the nav entry with no nav-specific logic beyond what exists.
- New `src/components/VendorCrmPaused.tsx` (mirroring `FundraiserPagesPaused`), rendered by `vendors.index.tsx`, `vendors.$id.tsx`, and `vendors.new.tsx` when the switch is off and the viewer is not a Super User.
- Add the second switch row to the `SiteSwitchesCard` in `src/routes/admin.flags.tsx`, reusing `useSiteSettings()` and the `SITE_SETTINGS_KEY` cache update.
- Verify by switching off (vendor link and pages hidden for a non-Super-User, notice shown, Super User still gets in, access-granting card still present) and back on.
