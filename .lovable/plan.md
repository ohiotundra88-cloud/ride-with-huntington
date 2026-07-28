
## Goal

Move the first slice of Team Huntington Hub off `localStorage` and onto Lovable Cloud: real Huntington-email OTP sign-in, a `profiles` row per user, participant registration data, and admin-managed FAQs. Ship a proper `user_roles` table and auto-grant `admin` to the verified `ChrisKemper` Huntington email. All other admin-authored content (announcements, goals, timeline, packing, concierge, audit log, feature flags) stays on `localStorage` in this pass.

## What stays vs. what moves

| Area | Now (localStorage) | After this pass |
|---|---|---|
| Sign-in (mock OTP) | localStorage user | Supabase email OTP, restricted to `@huntington.com` |
| Participant wizard state | localStorage `useStore` | `participants` row, keyed by `auth.uid()` |
| FAQs (built-ins + custom + overrides) | `faq-data.ts` + `useFaqAdmin` | `faqs` table (seeded from `faq-data.ts`) |
| Admin role gate | Base64 `ChrisKemper/Kemper@1988` dialog | `user_roles` + `has_role()`; `ChrisKemper` auto-granted on verified sign-in |
| Announcements / goals / timeline / packing / concierge / flags / audit | localStorage | Unchanged (next pass) |

## Database schema

```text
profiles (id uuid PK -> auth.users, email text, full_name text, created_at)
app_role enum: 'admin' | 'editor' | 'user'
user_roles (id, user_id -> auth.users, role app_role, unique(user_id, role))
participants (
  user_id uuid PK -> auth.users,
  role text ('rider'|'volunteer'|null),
  pelotonia_id text, high_roller bool, survivor bool,
  travel jsonb, hotel jsonb, apparel jsonb, mailing jsonb,
  status text, updated_at timestamptz
)
faqs (
  id uuid PK, slug text unique, title text, category text,
  keywords text[], body text, hidden bool default false,
  is_builtin bool default false, source_id text,  -- links back to seed id
  created_by uuid, updated_by uuid, updated_at timestamptz
)
```

RLS:
- `profiles`: user reads/updates own row; admins read all.
- `user_roles`: user reads own roles; only admins write (via `has_role`).
- `participants`: user reads/writes own row; admins read all, export.
- `faqs`: `anon` + `authenticated` SELECT where `hidden = false`; admins full CRUD.

Grants on every table per Data API rules (`authenticated` + `service_role`; `anon` only on `faqs` SELECT).

`has_role(_user_id, _role)` security-definer function to avoid recursive RLS.

Auto-admin trigger (`grant_role_for_verified_domain` pattern) that grants `admin` when `auth.users.email_confirmed_at` transitions non-null AND email equals `chris.kemper@huntington.com` (verified-email check prevents anyone signing up with that address).

Auto-profile trigger: on `auth.users` insert, create matching `profiles` row.

Seed migration: `INSERT` every current FAQ from `faq-data.ts` into `faqs` with `is_builtin=true`, preserving `source_id` = current string id.

## Auth flow

- Supabase email OTP (magic link/6-digit code). Sign-in form rejects addresses that don't end in `@huntington.com` before submitting.
- Route layout: keep `src/routes/index.tsx` public (landing). Put the wizard, dashboard, family, packing, team, resources admin, and all `/admin/*` routes under the managed `src/routes/_authenticated/` gate. Public routes stay public: `/`, `/auth`, `/resources`, `/resources/$id`, `/expenses`, `/faq`.
- `__root.tsx` gets a single `onAuthStateChange` subscriber (SIGNED_IN/OUT/USER_UPDATED only) that invalidates the router and query cache.
- Sign-out follows the four-step hygiene (cancel queries → clear cache → `signOut` → navigate replace to `/auth`).
- Retire the Base64 Super User dialog. "Super User Mode" in the profile menu becomes visible only when `has_role(auth.uid(),'admin')` returns true; toggling it just flips the preview lens.

## Server functions (new)

All under `src/lib/*.functions.ts`, using `requireSupabaseAuth` unless noted:

- `getMyParticipant`, `upsertMyParticipant(patch)` — wizard reads/writes.
- `listParticipantsAdmin`, `exportParticipantsCsvAdmin` — admin dashboard (verifies admin via `has_role`).
- `listFaqsPublic` (server publishable client, `hidden=false`) — resource center + `list_faqs`/`search_faqs` MCP tools.
- `listFaqsAdmin`, `upsertFaqAdmin`, `deleteFaqAdmin`, `toggleFaqHiddenAdmin` — admin FAQ editor.
- `getMyRoles` — powers the admin UI gate.

MCP tools swap their in-memory reads for `listFaqsPublic`; the manifest stays public.

## Client refactor

- `src/lib/store.tsx`: participant slice becomes a React Query wrapper over `getMyParticipant` / `upsertMyParticipant`; local-only UI state (current wizard step, preview lens) stays in Context.
- `src/lib/faq-store.ts`: replaced by React Query hooks around the FAQ server fns. Merging logic disappears — the DB is the source of truth.
- `src/routes/register.tsx`: each step calls `upsertMyParticipant` on Next; review reads from server.
- `src/routes/admin.faqs.tsx`: CRUD wired to server fns; "Reset to default" restores the seeded row for builtins.
- `src/routes/admin.index.tsx` + `AdminShell`: gate on `getMyRoles` instead of the local `superUser` boolean; keep preview-as toolbar.
- `AppNav`: profile menu shows email + admin badge; "Super User Mode" replaced by "Admin console" link when the user has the role.
- One-time migration helper (dev-only button in the profile menu) that pushes existing localStorage participant + FAQ data into the DB, so demo state isn't lost.

## Route structure changes

```text
src/routes/
  index.tsx                        (public landing)
  auth.tsx                         (public email OTP)
  resources.tsx, resources.$id.tsx (public)
  expenses.tsx, faq.tsx            (public)
  _authenticated/route.tsx         (integration-managed gate)
  _authenticated/register.tsx
  _authenticated/dashboard.tsx
  _authenticated/family.tsx
  _authenticated/packing.tsx
  _authenticated/team.tsx
  _authenticated/confirmation.tsx
  _authenticated/analytics.tsx
  _authenticated/admin/…           (moved from admin.*.tsx)
```

## Verification

1. Sign in with a non-Huntington email → blocked in the form; retry with a Huntington test address → OTP received, profile row created.
2. Sign in as `chris.kemper@huntington.com` → `user_roles` row exists, `/admin` reachable, preview-as toolbar works.
3. Fill wizard step-by-step → refresh → data restored from DB, not localStorage.
4. Edit a builtin FAQ in admin → change shows on `/resources`; hide it → disappears from public list and MCP `search_faqs`; reset → original body returns.
5. Log out → cache cleared, protected routes bounce to `/auth`, back button doesn't restore.

## Out of scope (next pass)

Announcements, fundraising goals, readiness weights, timeline, notifications, packing presets, concierge keywords, feature flags, and audit log stay in localStorage. Migrating them will reuse the same pattern (table + RLS + server fns + admin store swap).
