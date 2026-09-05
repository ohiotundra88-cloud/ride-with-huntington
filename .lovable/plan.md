# Make profile saving reliable for everyone

The permission error itself is already gone: saving details now writes only the personal fields (name, email, mobile, segment, market, manager, consent) instead of touching the protected identity column.

One gap remains. Because the save now only *updates* an existing profile row, a colleague who does not yet have a profile row gets a save that quietly succeeds while storing nothing. Their details still vanish on reload, with no error shown.

## What to change

1. **Detect the "nothing was saved" case.** Ask the database to report how many rows the save touched. If it touched none, the person has no profile row yet.
2. **Create the row on first save**, through a trusted server-side action that writes only the same personal fields for the signed-in person. It cannot be used to grant access levels or activation stamps.
3. **Surface real failures.** If a save genuinely fails, show a short "Couldn't save your details — please try again" message instead of leaving the screen looking updated.

## Verification

- Sign in as an existing colleague, change the Manager field, reload, confirm it persisted.
- Simulate a colleague with no profile row, save details, confirm the row is created and the values persist.
- Confirm the save still cannot change dashboard access or activation stamps.

## Technical notes

- `saveProfile` in `src/lib/store.tsx`: keep the column-scoped `.update()`, add `{ count: "exact" }` (or `.select("id")`) to detect a zero-row result.
- New server function (e.g. `ensureMyProfile` in `src/lib/profile.functions.ts`) with `.middleware([requireSupabaseAuth])`, validating input with Zod and upserting only the whitelisted personal columns for `context.userId`; privileged columns are never in the payload and the existing `protect_profile_privileged_columns` trigger stays as the second layer.
- Call it only on the zero-row path, then retry the update once.
