# Tighten admin vs super user permissions

Three changes, all about who is allowed to do what. No visual redesign.

## 1. Only super users can add or remove admins

Today any admin can grant or revoke the admin role. After this change, granting
and revoking admin access requires the super user role.

- The "Grant admin access" box and the revoke buttons on the roles screen are
  hidden for admins who are not super users; they still see the list of current
  admins as read-only.
- The server refuses the change too, so it can't be worked around.
- A super user still cannot remove their own admin/super user access (existing
  safeguard kept).

## 2. FAQ editing accepts super users

The FAQ management screen currently only accepts the admin role, so someone who
holds super user but not admin is refused. It will accept either role, matching
every other content screen.

## 3. Participant list accepts super users

Same fix for the admin participants list read.

## Technical notes

- `src/lib/roles-admin.server.ts`: add `assertAdminOrSuperUser(context)` helper
  (has_role admin OR is_superuser). Keep `assertAdmin` for genuinely
  admin-scoped use.
- `src/lib/admins.functions.ts`: `grantAdminByEmail` and `revokeAdmin` switch
  from `assertCallerIsAdmin` to `assertSuperUser`; `listAdmins` uses
  `assertAdminOrSuperUser`.
- `src/lib/faqs.functions.ts` (`listFaqsAdmin`, `upsertFaqAdmin`, and any
  sibling delete/hide handler) and `src/lib/participants.functions.ts`
  (`listParticipantsAdmin`): replace the inline `has_role('admin')` RPC check
  with `assertAdminOrSuperUser`.
- `src/lib/roles-manage.functions.ts`: `listRoleMembers` /
  `searchRegisteredUsers` move to `assertAdminOrSuperUser` so a bare super user
  can use the roles screen.
- `src/routes/admin.users.tsx`: gate the grant form and revoke actions on
  `user.isSuperUser`, with a short note explaining the restriction.
- Verify with `bunx tsgo --noEmit`.
