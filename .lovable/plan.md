# Fix the crammed top navigation for Captains and Super Users

## What's wrong

The desktop header puts every nav item in a single row. A regular member sees 11 links, but a Captain adds "Captains Lounge" + "My Fundraisers", and a Super User with Vendor CRM access adds "Vendor CRM" + "Super User" — up to 15 items in one row.

Because nothing prevents wrapping, the row runs out of space and the labels break onto two lines: "Team / Huntington / Hub", "My / Journey", "Fundraiser / Request", "Captains / Lounge", "Vendor / CRM", "Super / User". That's the squished look in the screenshot.

## The fix: group the links

Keep a short row of top-level items and move the rest into grouped dropdown menus, so the header stays one clean line at any signed-in role.

Proposed grouping:

```text
[logo] Team Huntington Hub   Home   My Journey   Team ▾   Fundraising ▾   Resources ▾   [Super User]   [bell] [Chris ▾]
```

- **Home**, **My Journey** — stay as direct links (most used)
- **Team ▾** — Team, Family, Events, Packing
- **Fundraising ▾** — Fundraisers, Fundraiser Request, My Fundraisers, Captains Lounge (Captains only), Vendor CRM (when access allows)
- **Resources ▾** — Register, Resources, Expenses
- **Super User** — stays a distinct highlighted link when Super User Mode is on, so it remains obvious

Each dropdown highlights when the current page lives inside it, so you always know where you are.

## Also fixed

- Labels get `whitespace-nowrap` so a tight fit can never split a label mid-word again.
- The "Team Huntington Hub" wordmark stops wrapping; it shortens to "Team Huntington" on narrower desktop widths.
- The grouped menu appears from the medium breakpoint up (today the full row only appears at `lg`, leaving tablets with just a hamburger).
- Mobile stays as-is: the hamburger sheet keeps the flat list of every link the user can access, now visually grouped with small section headings.

## Technical notes

- Single file: `src/components/AppNav.tsx`.
- Replace the flat `links` array with a grouped structure (`{ label, items[] }`), each item carrying an optional visibility predicate driven by the existing `user.signedIn`, `user.isReviewer`, and `vendorAccess?.allowed` values. No new data fetching, no permission changes.
- Render groups with the existing shadcn `DropdownMenu` primitives already imported in this file, so styling matches the current header.
- Active-state detection compares `pathname` against the group's item paths.
- No routing, server-function, or database changes — presentation only.
