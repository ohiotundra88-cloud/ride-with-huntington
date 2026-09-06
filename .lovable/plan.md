# Fix false "complete" tasks on brand-new accounts

## What's happening

The new test account (pelotonia@huntington.com) has a completely empty record in the database — no Pelotonia details, no apparel sizes, nothing submitted. Confirmed by querying the account directly.

So the "complete" and "Ordered" badges are not coming from that account's data. They come from a leftover copy of a *previous* person's answers saved in the browser on that device. When you sign in, the Hub loads that leftover copy first and then layers the account's real (empty) record on top — and because the real record is empty, nothing gets replaced. The badges keep showing the old answers while the task screens, which read the live record, are blank.

The readiness ring then adds up those false completions, which is why it showed 20% with nothing done.

## What I'll change

1. **Leftover answers can never bleed into another account.** The saved-on-device copy gets tied to the specific person it belongs to. Signing in as someone else starts clean instead of inheriting the previous person's answers.

2. **Signing in trusts the account's real record.** The Hub will show exactly what's stored for that account, rather than filling gaps with whatever was left on the device.

3. **A task only reads "complete" when the information is actually there.** Pelotonia, travel, bike and apparel each check that their key fields are filled before showing a done badge. Empty means **Action needed**, so a badge can never disagree with what you see when you open the task.

4. **Readiness reflects reality.** With false completions gone, the ring drops to only the steps genuinely finished. Choosing how you're taking part still counts as one step (that's a real choice the person made), so a brand-new rider who has done nothing else will sit at a small number rather than 20% from phantom tasks.

## Verification

Sign in as the test account in a browser and confirm: all four tasks read "Action needed", the ring matches, opening each task shows empty fields, and filling one in flips just that badge. Then sign out, sign in as a different account, and confirm no answers carry over.

## Technical notes

- `src/lib/store.tsx`: namespace the `hh_reg_v2` localStorage key by user id; on sign-in, build registration from `emptyReg` + the cloud row instead of spreading over `prev`; reset to `emptyReg` when the signed-in user id differs from the cached one; guard the debounced `upsertMyParticipant` from writing stale cached state before the cloud row has loaded.
- New shared helper deriving each step's effective status from its required fields (e.g. apparel needs a jersey/shirt size; Pelotonia needs confirmation/HB number), used by the dashboard overlay in `src/routes/dashboard.tsx` and by `completion`/`incompleteStep` in `store.tsx`, so stored `status` values can't outrank missing data.
- No database or security changes; RLS, grants and the profile protection trigger stay untouched.
