# Configuration reference

Every setting, secret and platform binding the Hub reads, where it is read, and what happens when it is missing. All example values are fake.

- For local development, copy `.env.example` to `.env.local`. `npm run dev` loads it into the server's environment.
- On Azure, set these as App Service or Container Apps application settings. Put secrets in Key Vault and reference them.
- On Cloudflare (the temporary preview), plain values are `vars` in `wrangler.jsonc` and secrets are set with `wrangler secret put`.

## "Missing server setting X. See docs/CONFIGURATION.md."

This error comes from `setting()` in `src/server/runtime.ts`. The server needed a required setting and it was empty or absent. Find `X` in the tables below and set it. The server looks first at Cloudflare's per-request environment (only present on Workers), then at `process.env`. There are no other sources, so a value in a file that is not loaded (for example `.env` on a production host) does not count.

Other configuration errors you may see:

| Message                                                                           | Cause and fix                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `portal-auth: sessionSecret must be at least 32 characters`                       | `SESSION_SECRET` is shorter than 32 characters.                                                                                                                                       |
| `File storage (HUB_FILES) is not configured.`                                     | Uploads and file downloads need the `HUB_FILES` bucket binding. It exists only on Cloudflare today. On Node (local dev, Azure) you need the Azure Blob adapter in docs/DEPLOYMENT.md. |
| `Unknown EMAIL_PROVIDER "..."`                                                    | `EMAIL_PROVIDER` must be `resend` or `log` (or a provider you add).                                                                                                                   |
| `Could not open your Hub account: ...` in the server log after sign-in            | `hub_sign_in` refused the person. Usually a non-Huntington address that is not in `hub_email_allowlist`, or a changed provider subject. See docs/ENTRA.md.                            |
| PostgREST `PGRST125 Invalid path specified in request URL`                        | `HUB_DB_URL` points straight at PostgREST. It must point at the `/rest/v1` gateway. See `HUB_DB_URL` below.                                                                           |
| PostgREST `401` `PGRST301` "No suitable key or wrong key type" on every data call | `HUB_DB_JWT_SECRET` differs from PostgREST's `PGRST_JWT_SECRET`.                                                                                                                      |
| `Missing HUB_REST_URL` or `Missing HUB_DB_JWT_SECRET` (sync job, exit 2)          | The sync job's required settings. See "Pelotonia sync job" below.                                                                                                                     |

## Summary

| Group                           |  Count | Where                                                              |
| ------------------------------- | -----: | ------------------------------------------------------------------ |
| Web app settings and secrets    |     18 | `setting()` calls in `src/`, plus three direct `process.env` reads |
| Cloudflare bindings             |      3 | `wrangler.jsonc` (`HUB_SESSIONS`, `HUB_FILES`, `ASSETS`)           |
| Build and Node runtime          |      3 | `vite.config.ts`, Nitro's Node server                              |
| Pelotonia sync job              |      6 | `jobs/pelotonia-sync/` (plus shared ones listed there)             |
| Local database tooling          |      6 | `supabase/tests/local/reset.sh`, `scripts/gen-db-types.mjs`        |
| **Total read by this repo**     | **36** |                                                                    |
| PostgREST (not read by the app) |      4 | the PostgREST container                                            |

No `VITE_*` variable is read anywhere in `src/`. The `VITE_SUPABASE_*` and `SUPABASE_*` values in the committed `.env` are leftovers from the Lovable-hosted version and are unused.

## Web app: site

| Name                  | Required | Example                   | What it does                                                                                                                                                                                                                                     | Read in                        |
| --------------------- | -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `PUBLIC_ORIGIN`       | Yes      | `https://hub.example.com` | The Hub's public origin, no trailing slash. Builds the sign-in redirect URI `<PUBLIC_ORIGIN>/auth/callback`. When it starts with `https://` the session cookie is named `__Host-hub_session` and marked `Secure`; otherwise it is `hub_session`. | `src/server/session.server.ts` |
| `HUB_REQUIRE_SIGN_IN` | No       | `true`                    | `true` puts every page and API behind sign-in, except `/auth/*`, `/robots.txt` and `/favicon*`. Anything else (including empty) leaves public pages open. The preview sets `true`.                                                               | `src/server/site-gate.ts`      |

Email links in the templates use a fixed site address, `https://www.ridewithhuntington.com` (the `SITE` constant in each file under `src/lib/email-templates/`). It is not configurable today. If Huntington hosts the Hub elsewhere, change those constants.

## Web app: sign-in

Read only in `src/server/session.server.ts`, which passes them to the vendored Aspire Identity client (`src/server/vendor/portal-auth/`). docs/ENTRA.md explains how these change for Microsoft Entra ID.

| Name                 | Required | Example                        | What it does                                                                                                                                                                              |
| -------------------- | -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_BASE_URL`      | Yes      | `https://identity.example.com` | Identity provider base URL. The OpenID issuer is `<AUTH_BASE_URL>/api/auth` and discovery is read from `<issuer>/.well-known/openid-configuration`.                                       |
| `AUTH_CLIENT_ID`     | Yes      | `team-huntington-hub`          | OAuth client id registered with the provider. Also the expected ID token audience.                                                                                                        |
| `AUTH_CLIENT_SECRET` | Yes      | `(secret)`                     | OAuth client secret. Sent with HTTP Basic auth to the token endpoint. **Secret.**                                                                                                         |
| `AUTH_ORG_SLUG`      | Yes      | `team-huntington`              | The provider organization a person must belong to. The ID token's `orgs` claim must contain it, or sign-in fails with `403 not-a-member`.                                                 |
| `SESSION_SECRET`     | Yes      | `(32+ random characters)`      | HMAC key for the session cookie and the short-lived sign-in transaction cookie. Also seals refresh tokens in D1 mode. At least 32 characters. Rotating it signs everyone out. **Secret.** |

## Web app: database

Read in `src/server/backend.server.ts`. See docs/ARCHITECTURE.md, "Data access and row-level security".

| Name                          | Required | Example                       | What it does                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HUB_DB_URL`                  | Yes      | `https://db-gateway.internal` | Base URL of the database **gateway**. Both supabase-js and the browser proxy call `<HUB_DB_URL>/rest/v1/<table>`. PostgREST itself serves at its root, so a reverse proxy must forward `/rest/v1/*` to PostgREST with the prefix removed. Pointing this straight at PostgREST gives `PGRST125`. Trailing slashes are trimmed. |
| `HUB_DB_JWT_SECRET`           | Yes      | `(32+ random characters)`     | HS256 key the server uses to sign a 5-minute token for every database call. The token names the Postgres role (`anon`, `authenticated`, `service_role`) and, when signed in, the user id. Must equal PostgREST's `PGRST_JWT_SECRET`. Anyone holding it can act as `service_role`, which bypasses RLS. **Secret.**             |
| `HUB_DB_ACCESS_CLIENT_ID`     | No       | `abc123.access`               | Temporary preview only. Sent as `CF-Access-Client-Id` so requests pass Cloudflare Access in front of the database tunnel. Used only when both Access values are set. Leave empty on Azure.                                                                                                                                    |
| `HUB_DB_ACCESS_CLIENT_SECRET` | No       | `(secret)`                    | Pair of the above, sent as `CF-Access-Client-Secret`. **Secret.**                                                                                                                                                                                                                                                             |

## Web app: email

Read in `src/lib/email-templates/send-email.ts`.

| Name                | Required                     | Example                                 | What it does                                                                                                                                                                  |
| ------------------- | ---------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMAIL_PROVIDER`    | No (default `resend`)        | `log`                                   | `resend` sends through Resend's HTTP API. `log` writes `[email] <to> · <subject>` to the server log and sends nothing. Use `log` locally.                                     |
| `EMAIL_FROM`        | No                           | `Team Huntington Hub <hub@example.com>` | Sender. Defaults to the preview's sending address, which Huntington should replace with its own verified sender.                                                              |
| `RESEND_API_KEY`    | When `EMAIL_PROVIDER=resend` | `re_xxxxxxxx`                           | Resend API key. **Secret.**                                                                                                                                                   |
| `EMAIL_REDIRECT_TO` | No                           | `test-inbox@example.com`                | Sends every message to this one address instead of the real recipient, and prefixes the subject with `[to <real recipient>]`. Set it on every non-production copy of the Hub. |

## Web app: Pelotonia public data

The web app reads Team Huntington numbers from the Pelotonia team dashboard first (`src/lib/pelotonia-dashboard.server.ts`), the source the original Hub used and the one the team reports from. If the dashboard is down or doesn't list a rider, it falls back to the nightly synced copy, then to Pelotonia's public data service (`src/lib/pelotonia-api.server.ts`). All three are read with `process.env` at module load. The sync job reads only the last two names.

| Name                        | Required | Example                                                            | What it does                                                                                           |
| --------------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `PELOTONIA_DASHBOARD_BASE`  | No       | `https://pelotonia-dashboard-401340053598.us-central1.run.app`     | The Team Huntington Pelotonia dashboard (`/api/bundle/core`, `/api/members`). That URL is the default. |
| `PELOTONIA_API_BASE`        | No       | `https://pelotonia-p3-middleware-production.azurewebsites.net/api` | Pelotonia's public data service (the one my.pelotonia.org uses). That URL is the default.              |
| `PELOTONIA_TEAM_PELOTON_ID` | No       | `a0s3t00000BKX8sAAH`                                               | Team Huntington Bank's top-level peloton. That id is the default.                                      |

## Cloudflare bindings (temporary preview only)

Bindings are objects, not strings. They exist only on Cloudflare Workers and are read through `binding()` in `src/server/runtime.ts`. On Node (local dev and Azure) they are always absent.

| Binding        | Type          | Required             | What it does                                                                                                                                                                                                                                                                                            | Read in                        |
| -------------- | ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `HUB_SESSIONS` | D1 database   | No                   | Server-side, revocable sessions (table from `deploy/cloudflare/d1-migrations/0001_portal_sessions.sql`). With it: 8-hour sessions, logout revokes, membership re-checked every 10 minutes. Without it: a signed cookie that lasts 1 hour and cannot be revoked early. Node always uses the cookie mode. | `src/server/session.server.ts` |
| `HUB_FILES`    | R2 bucket     | For any file feature | All uploaded files. Object keys are `<bucket>/<path>`, where bucket is `avatars`, `branding`, `captain-docs`, `event-fliers`, `fundraising-assets` or `vendor-files`. Without it every upload and file download fails with `File storage (HUB_FILES) is not configured.`                                | `src/server/backend.server.ts` |
| `ASSETS`       | Static assets | Yes on Workers       | Serves `.output/public` (JavaScript, CSS, images). Used by the Nitro runtime, not by app code.                                                                                                                                                                                                          | `wrangler.jsonc`               |

## Build and Node runtime

| Name           | Required          | Example       | What it does                                                                                                                                                                  | Read in           |
| -------------- | ----------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `NITRO_PRESET` | No (build time)   | `node-server` | Server target. Default `cloudflare-module`. `npm run build:node` sets `node-server`, which produces a self-contained `.output/` you run with `node .output/server/index.mjs`. | `vite.config.ts`  |
| `PORT`         | No (Node runtime) | `8080`        | Port for the Node server. Default 3000. Azure App Service sets it for you.                                                                                                    | Nitro Node server |
| `HOST`         | No (Node runtime) | `0.0.0.0`     | Interface to bind. Default is all interfaces.                                                                                                                                 | Nitro Node server |

## Pelotonia sync job

Read by `jobs/pelotonia-sync/sync.mjs` and `scheduler.mjs`. The job also reads `HUB_DB_JWT_SECRET`, `PELOTONIA_API_BASE` and `PELOTONIA_TEAM_PELOTON_ID` described above. `HUB_DB_JWT_SECRET` is required. The job exits with code 2 and `Missing <NAME>` if a required value is absent.

| Name                  | Required | Example                        | What it does                                                                                                                                        |
| --------------------- | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HUB_REST_URL`        | Yes      | `http://postgrest:3000`        | PostgREST **root** URL (no `/rest/v1`). The job talks to PostgREST directly as `service_role`. Note the difference from the web app's `HUB_DB_URL`. |
| `SYNC_PROFILES`       | No       | `stale`                        | `all` (default) fetches every rider profile; `stale` only profiles older than 20 hours; `none` skips profiles.                                      |
| `SYNC_MAX_PROFILES`   | No       | `500`                          | Cap on rider profiles per run. Default: no cap.                                                                                                     |
| `PLEDGEIT_KIDS_SLUGS` | No       | `PelotoniaKids-TeamHuntington` | Comma-separated PledgeIt campaign slugs for Pelotonia Kids. That slug is the default. An empty string skips PledgeIt.                               |
| `SYNC_AT`             | No       | `03:30`                        | `scheduler.mjs` only. Daily run time, 24-hour `HH:MM`, in the process time zone.                                                                    |
| `TZ`                  | No       | `America/New_York`             | `scheduler.mjs` only. Standard Node/OS time zone variable. Set it, or `SYNC_AT` is interpreted in the container's default (usually UTC).            |

## Local database tooling

Read from your shell by `supabase/tests/local/reset.sh`, the `test:db` npm script and `scripts/gen-db-types.mjs`. They are not loaded from `.env.local`. The CI workflow sets the same names.

| Name              | Default                                | What it does                                                                         |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `PGHOST`          | `/tmp`                                 | PostgreSQL host or Unix socket directory. Use `localhost` for TCP (Docker, CI).      |
| `PGPORT`          | `54329`                                | PostgreSQL port.                                                                     |
| `PGDATABASE_TEST` | `rwh_test`                             | Throwaway database that `reset.sh` drops and recreates. Never point it at real data. |
| `PSQL`            | `psql`                                 | Path to the `psql` client (use a version 17 client).                                 |
| `LC_ALL`          | `en_US.UTF-8`                          | Locale for `psql`. Use `C.UTF-8` on Linux images that lack `en_US.UTF-8`.            |
| `DATABASE_URL`    | built from the four `PG*` values above | `scripts/gen-db-types.mjs` only: the database to read the schema from.               |

All scripts connect as the `postgres` user. Standard libpq variables such as `PGPASSWORD` also work.

## PostgREST settings (not read by this repo)

The PostgREST container needs these. They are listed here because two of them must agree with the Hub.

| Name                 | Example                                                           | Must match                                                           |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `PGRST_DB_URI`       | `postgres://authenticator:(password)@db:5432/hub?sslmode=require` | Connects as the `authenticator` login role (see docs/DEPLOYMENT.md). |
| `PGRST_DB_SCHEMAS`   | `public`                                                          | The app only uses `public`.                                          |
| `PGRST_DB_ANON_ROLE` | `anon`                                                            | Role for requests without a token.                                   |
| `PGRST_JWT_SECRET`   | `(32+ random characters)`                                         | Must equal the Hub's `HUB_DB_JWT_SECRET`.                            |

## Secrets checklist

Treat these as secrets. Store them in Key Vault (Azure) or `wrangler secret` (Cloudflare), never in git:

`AUTH_CLIENT_SECRET`, `SESSION_SECRET`, `HUB_DB_JWT_SECRET`, `HUB_DB_ACCESS_CLIENT_SECRET`, `RESEND_API_KEY`, and PostgREST's `PGRST_DB_URI` (contains the database password).

Generate random secrets with, for example, `openssl rand -base64 48`.
