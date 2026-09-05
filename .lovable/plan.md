# Fix: saving profile details is rejected

## What's happening

When a colleague saves their details on the Profile page (name, email, mobile, segment, market, manager, privacy consent), the Hub sends the whole record — including the hidden account identifier — back to the database as a "create or replace" write.

Since the 4 September security tightening, colleagues are deliberately allowed to change only their own personal fields, never the identifier. Because the identifier is included in the write, the database refuses the entire save with a permission error. The form still shows the new values on screen, so the change looks saved until the page is reloaded.

Confirmed in the current code: the Profile save builds a create-or-replace write that includes the identifier, and the database grant list intentionally leaves the identifier out of what colleagues may change.

## The fix

Change the Profile save to a plain edit of the colleague's own row, targeting it by identifier instead of sending the identifier as data to be written. Nothing about permissions changes, so a colleague still cannot give themselves extra access.

- Keep the same fields being saved: email, name, mobile, segment, market, manager, consent.
- If no row exists yet for a brand new account (rare — one is normally created at sign-up), fall back to creating it once, without the identifier in the update path.
- Surface a clear message if the save is still refused, instead of silently showing unsaved values.

## Technical detail

In `src/lib/store.tsx`, `saveProfile()` currently calls
`supabase.from("profiles").upsert({ id, ... })`. PostgREST compiles that to
`INSERT ... ON CONFLICT DO UPDATE SET` over every payload column, including `id`,
and migration `20260904002217` grants column-level `UPDATE` on `profiles` without
`id` — hence `42501 permission denied for table profiles`.

Replace it with:

- `supabase.from("profiles").update({ email, full_name, mobile, segment, market, manager, consent }).eq("id", id).select("id")`
- if the update matched no rows, do a single `insert({ id, ... })` (INSERT is granted, so `id` is fine there)
- throw the Supabase error message so the UI toast reports a real failure

No migration and no grant changes are needed. Verification: sign in as a real
colleague in the sandbox browser, save a changed mobile number, reload, and
confirm the value persisted and no permission error appears in the logs.
