# Make "Journey progress" and the dashboard ring agree

## What's happening

The test account `pelotonia@huntington.com` has chosen "rider" but has no other details saved (confirmed: registration, travel, bike and apparel are all empty).

Two different scores are being shown for the same person:

- The home page welcome card counts "chose how you're taking part" as one of five steps, so it shows 20%.
- My Dashboard scores only the task cards (registration, travel, bike, apparel, volunteer, fundraising), none of which is "how you're taking part", so it shows 0%.

Neither number is wrong on its own — they measure different things, which reads as a bug.

## The fix

Use one number everywhere. The dashboard's readiness ring becomes the single source of truth, and the home page welcome card shows that same percentage.

- One shared calculation, used by both screens, so the two can never drift again.
- Picking how you take part stays what it is: it unlocks the tasks but no longer counts as progress by itself, so a brand-new account reads 0% on both screens until a real task is finished.
- Steps that don't apply (a volunteer's bike step) stay excluded, so the ring can still reach 100%.
- The "What do I need to do next?" button on the home page keeps pointing at the first unfinished step — unchanged.

Result for the test account: 0% on the home page and 0% on My Dashboard, both moving up together as each task is genuinely completed.

## Technical notes

- Extract `mergeReadinessWithRegistration` from `src/routes/dashboard.tsx` into a shared module (e.g. `src/lib/readiness-progress.ts`) alongside a `useJourneyScore()` hook that pulls admin readiness state, `registration`, and the `getRiderFundraising` query (same `queryKey`, so no extra fetch) and returns `readinessScore(merged)`.
- `src/routes/dashboard.tsx` consumes the hook instead of its local merge; behaviour of the cards is unchanged.
- `SignedInHero` in `src/routes/index.tsx` renders the hook's value instead of `completion` from `src/lib/store.tsx`.
- `completion` in `src/lib/store.tsx` stays for the register wizard, but the progress bar no longer depends on it; `incompleteStep` is untouched.
- Verify live signed in as the test account: home card and dashboard both show 0%, then both move after saving one task.
