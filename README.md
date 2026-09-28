# Team Huntington Hub

The Team Huntington Hub is the internal web app for Huntington colleagues who ride, volunteer or fundraise with Team Huntington in Pelotonia. It gives colleagues one place to register and track their ride weekend, and gives captains, co-chairs and reviewers the tools to run the team's fundraising.

It was prototyped in Lovable by Chris Kemper (Huntington, Pelotonia co-chair), then moved off Lovable to standard, self-hostable tooling. It currently runs as a private preview. The expected long-term home is Azure with Microsoft Entra ID sign-in.

**New to the codebase? Read in this order:** this README, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/CONFIGURATION.md](docs/CONFIGURATION.md), then [docs/VISUAL-STUDIO.md](docs/VISUAL-STUDIO.md).

## Features

For colleagues

- **Registration journey**: rider, volunteer or challenger; Pelotonia registration, travel and hotel, bike rental, apparel and mailing address, with progress and a readiness checklist (`/register`, `/dashboard`).
- **Team snapshot and rider progress**: Team Huntington's live Pelotonia fundraising, sub-teams, riders and Pelotonia Kids, from a nightly sync (`/team`, `/rider-progress`).
- **Fundraiser approval requests**: file a fundraiser, pick your captain, answer the policy questions (property, food, alcohol, logos), attach a flier, and track approval (`/fundraiser-request`).
- **Fundraiser pages**: a public, shareable page per approved fundraiser with a demo checkout, raffle draws, payouts and a year summary (`/fundraisers/:slug`, `/my-fundraisers`). The payment provider is a demo; no real money moves.
- **Events**: the fundraising events calendar and invite-only team events with RSVP (`/events`, `/team-events`, `/my-events`).
- **Inbox and messages**: targeted team announcements with email delivery and opt-out (`/inbox`, `/messages`).
- **Resources**: searchable FAQ, fundraising resources, expense guide, packing list, family guide (`/resources`, `/expenses`, `/packing`, `/family`).
- **Network self-check** for corporate VPN and web filter problems (`/health`, see [docs/IT-ALLOWLIST.md](docs/IT-ALLOWLIST.md)).

For leaders and reviewers

- **Approval queue**: Peloton Captain, then Legal, Risk, Compliance and Marketing in parallel, then Co-Chair sign-off, with emails at each step (`/admin/approvals`).
- **Vendor CRM**: vendors, contacts, donations, spend, sponsorship tiers, Pelotonia Kids gifts, sponsored rider slots, attachments and an audit log (`/vendors`).
- **Captains Lounge**: posts and documents for team leadership (`/captains-lounge`).
- **Super User console**: roles and admins, participants and permanent roster, season reset, FAQs, branding, test emails, site switches (`/admin/*`).

Some Super User console screens and `/analytics` still use browser-only demo data from the prototype. See "Parts that are still prototype-only" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack

| Layer         | Technology                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| UI            | React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Router and Query, react-hook-form, zod        |
| App framework | TanStack Start (file-based routes, SSR, server functions) on Vite 8 and Nitro 3                                 |
| Server target | Cloudflare Workers (`npm run build`) or a plain Node 22 server (`npm run build:node`)                           |
| Data          | PostgreSQL 17 with row-level security, reached through PostgREST; supabase-js is used only as the query builder |
| Sign-in       | OpenID Connect (Aspire Identity today; designed to swap to Microsoft Entra ID in one file)                      |
| Files         | Object storage adapter (Cloudflare R2 today; Azure Blob adapter to be added)                                    |
| Email         | React Email templates; Resend today, provider adapter for others                                                |
| Background    | `jobs/pelotonia-sync`, a zero-dependency Node job that copies public Pelotonia data nightly                     |

```mermaid
flowchart LR
  B[Browser] -->|same origin only| HUB[Hub web app<br/>TanStack Start + Nitro]
  HUB <-->|OIDC| IDP[(Identity provider)]
  HUB -->|signed JWT per request| GW["/rest/v1 gateway"] --> PGRST[PostgREST] --> PG[(PostgreSQL 17<br/>RLS)]
  HUB --> FILES[(Object storage)]
  HUB --> MAIL[Email provider]
  JOB[Pelotonia sync job] --> PGRST
  JOB --> PEL[(Pelotonia public data)]
```

## Quick start (local development)

You need Node 22.18 or newer, npm, a PostgreSQL 17 server and client, PostgREST, and nginx (or any reverse proxy). On macOS: `brew install postgresql@17 postgrest nginx`. On Windows, use WSL2 (see [docs/VISUAL-STUDIO.md](docs/VISUAL-STUDIO.md)).

1. **Install dependencies.**

   ```sh
   npm ci
   ```

2. **Build a local database from the migrations.** `reset.sh` drops and recreates the database named by `PGDATABASE_TEST`, applies a small shim that stands in for the Supabase platform objects (roles, `auth.users`, `auth.uid()`), then every migration. Use a separate name for your dev database so the test run does not wipe it.

   ```sh
   # Scripts default to a Unix socket in /tmp on port 54329. For a server on
   # localhost:5432 (Homebrew default or Docker) export:
   export PGHOST=localhost PGPORT=5432
   PGDATABASE_TEST=rwh_dev supabase/tests/local/reset.sh
   # -> ok: 50 migrations applied to rwh_dev
   ```

   Docker alternative: `docker run -d --name rwh-pg -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17` (local only).

3. **Let PostgREST log in.** The shim creates the `authenticator` role without a password. Give it one locally and let it switch to the three API roles:

   ```sh
   psql -h "$PGHOST" -p "$PGPORT" -U postgres -d rwh_dev -c \
     "ALTER ROLE authenticator WITH LOGIN PASSWORD 'local-only'; GRANT anon, authenticated, service_role TO authenticator;"
   ```

4. **Run PostgREST and the `/rest/v1` gateway.** The Hub calls `<HUB_DB_URL>/rest/v1/...`; PostgREST serves at its root, so a proxy strips the prefix.

   ```sh
   PGRST_DB_URI="postgres://authenticator:local-only@localhost:5432/rwh_dev" \
   PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon \
   PGRST_JWT_SECRET=local-dev-jwt-secret-at-least-32-characters-long \
   PGRST_SERVER_PORT=3000 postgrest
   ```

   In another terminal, run nginx on port 3001 with the gateway config from [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#the-database-gateway).

5. **Configure the app.**

   ```sh
   cp .env.example .env.local
   ```

   Set `HUB_DB_URL=http://localhost:3001` and `HUB_DB_JWT_SECRET` to the same value as `PGRST_JWT_SECRET`. Keep `EMAIL_PROVIDER=log`. Every variable is explained in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

6. **Start the app.**

   ```sh
   npm run dev
   # http://localhost:5173
   ```

What works locally without more setup: public pages, the database through the proxy, and the unit and database tests. Two things need extra setup:

- **Signing in** needs an OpenID Connect client that accepts `http://localhost:5173/auth/callback` as a redirect URI. With Microsoft Entra ID, register that URI on a development app registration ([docs/ENTRA.md](docs/ENTRA.md)).
- **File uploads** need object storage. On Node there is no storage adapter yet ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#file-storage-on-azure)).

## Scripts

| Command                             | What it does                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Vite dev server with hot reload on http://localhost:5173. Loads `.env.local`.                                                          |
| `npm run build`                     | Production build for Cloudflare Workers (`NITRO_PRESET=cloudflare-module`, the default).                                               |
| `npm run build:node`                | Production build for a plain Node server. Output in `.output/`; run `node .output/server/index.mjs`.                                   |
| `npm run preview`                   | Serves the last build locally.                                                                                                         |
| `npm run typecheck`                 | `tsc --noEmit`.                                                                                                                        |
| `npm run lint`                      | ESLint, including Prettier formatting.                                                                                                 |
| `npm run format`                    | Prettier on the whole repo.                                                                                                            |
| `npm test`                          | Unit tests (`node --test tests/*.test.ts`, Node's built-in runner with TypeScript type stripping).                                     |
| `npm run test:db`                   | Rebuilds the test database (`rwh_test` by default) from every migration and runs `supabase/tests/security_hardening.sql`.              |
| `npm run check`                     | typecheck, lint, unit tests and build in one go.                                                                                       |
| `node scripts/gen-db-types.mjs`     | Regenerates the Tables and Views in `src/integrations/supabase/types.ts` from the local database. Run Prettier on the file afterwards. |
| `node jobs/pelotonia-sync/sync.mjs` | One Pelotonia sync run (needs `HUB_REST_URL` and `HUB_DB_JWT_SECRET`).                                                                 |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, both builds, and the database tests against PostgreSQL 17 on every push and pull request.

## Project layout

```
.
├── src/
│   ├── routes/                 pages (*.tsx) and server routes (auth/*, api/public/*)
│   ├── lib/                    *.functions.ts (server functions), *.server.ts, *.shared.ts, email templates
│   ├── server/                 runtime settings, sign-in (session.server.ts), database + storage (backend.server.ts)
│   ├── integrations/supabase/  auth middleware, service client, browser client, generated DB types
│   ├── components/             app components; ui/ holds shadcn/ui primitives
│   ├── start.ts                request middleware (error page, sign-in wall, CSRF)
│   └── server.ts               server entry
├── supabase/
│   ├── migrations/             50 SQL migrations, the schema's single source of truth
│   └── tests/                  SQL security tests; local/ holds reset.sh and the platform shim
├── jobs/pelotonia-sync/        nightly Pelotonia and PledgeIt sync
├── tests/                      unit tests (node --test)
├── scripts/gen-db-types.mjs    database type generator
├── deploy/cloudflare/          D1 session table for the temporary preview
├── docs/                       the documentation below
├── wrangler.jsonc              Cloudflare Workers config (temporary preview)
└── vite.config.ts              build config; NITRO_PRESET picks Workers or Node
```

## Documentation

| Document                                       | Read it for                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Request flow, sign-in, data access and RLS, server functions, storage, email, sync, approvals |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every environment variable, secret and binding                                                |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | The temporary preview, and the recommended Azure deployment                                   |
| [docs/ENTRA.md](docs/ENTRA.md)                 | Replacing Aspire Identity with Microsoft Entra ID                                             |
| [docs/DATA-EXPORT.md](docs/DATA-EXPORT.md)     | Exporting all data and files, restoring into Azure, and a note on SQL Server                  |
| [docs/VISUAL-STUDIO.md](docs/VISUAL-STUDIO.md) | VS Code and Visual Studio setup, debugging, and using GitHub Copilot on this codebase         |
| [docs/IT-ALLOWLIST.md](docs/IT-ALLOWLIST.md)   | Network allowlist request for Huntington IT                                                   |
| [src/routes/README.md](src/routes/README.md)   | File-based routing conventions                                                                |

## A note on names

The code still says "supabase" in places (`requireSupabaseAuth`, `supabaseAdmin`, `supabase/migrations/`). There is no Supabase service any more. The names were kept so the Lovable-era handlers did not need rewriting: supabase-js is the PostgREST query builder, and `supabase/` is where migrations live.
