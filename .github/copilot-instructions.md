# Copilot instructions: Team Huntington Hub

Internal Huntington web app for Team Huntington's Pelotonia riders, volunteers and fundraising. TanStack Start (React 19 + Vite 8 + Nitro 3), TypeScript strict, Tailwind 4 + shadcn/ui, PostgreSQL 17 with row-level security behind PostgREST. Read `docs/ARCHITECTURE.md` for the full picture and `docs/CONFIGURATION.md` for settings.

## Where things live

- Pages: `src/routes/*.tsx` (file-based routing; `$param` for dynamic segments). Server-only routes: `src/routes/auth/*`, `src/routes/api/public/*`. Never edit `src/routeTree.gen.ts`.
- Server functions: `src/lib/<area>.functions.ts` (`createServerFn`). Server-only helpers: `src/lib/<area>.server.ts`. Types, zod schemas and pure logic shared with the browser and tests: `src/lib/<area>.shared.ts`.
- Platform layer: `src/server/` (`runtime.ts` settings, `session.server.ts` sign-in, `backend.server.ts` database and file storage).
- Database schema: `supabase/migrations/*.sql` only. Generated DB types: `src/integrations/supabase/types.ts`.
- UI primitives: `src/components/ui/` (shadcn/ui). App components: `src/components/`.
- Nightly Pelotonia sync: `jobs/pelotonia-sync/` (plain Node, zero dependencies).

## Rules

- Server functions: `createServerFn({ method })`, then `.middleware([requireSupabaseAuth])` for signed-in users, `.inputValidator(zodSchema)` for any input, then `.handler(async ({ context, data }) => ...)`.
- Query with `context.supabase` (acts as the signed-in user; RLS applies). Use `supabaseAdmin` from `@/integrations/supabase/client.server` (bypasses RLS) only after an explicit permission check such as `assertAdmin` or a `has_role` / `is_superuser` RPC.
- Import server-only modules inside handlers with `await import("@/lib/x.server")`. Client code must never import from `**/server/**` (the build fails).
- Read settings with `setting("NAME")` from `@/server/runtime`, never `process.env` directly in app code. Add every new setting to `docs/CONFIGURATION.md` and `.env.example`.
- Files: `supabaseAdmin.storage.from(bucket).upload/download/remove`. Serve user files through `src/routes/api/public/*` with `safeFileHeaders` from `@/lib/safe-file.server`.
- Email: `sendTemplateEmail(name, to, { templateData, idempotencyKey })`; register templates in `src/lib/email-templates/registry.ts`. Never let an email failure undo the action that caused it.
- Only `src/server/session.server.ts` may know which identity provider is used.
- Imports use the `@/` alias for `src/`. Prettier: 100 columns, double quotes, semicolons, trailing commas.
- The names `supabase*` are historical. There is no Supabase service; supabase-js is only the PostgREST query builder.

## Database changes

- Add a new migration file `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_case>.sql`; never edit an applied one. Make it safe to re-run where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`).
- Every new table: `ENABLE ROW LEVEL SECURITY`, explicit policies for `authenticated` (and `anon` only if public), and grants limited to what the app needs. Use `auth.uid()` for the signed-in user and helpers like `public.has_role(auth.uid(), 'admin')`.
- Approval, status and publishing fields change only through server functions (guard triggers enforce it).
- After schema changes: `npm run test:db`, then `node scripts/gen-db-types.mjs` and `npx prettier --write src/integrations/supabase/types.ts`. Add a case to `supabase/tests/security_hardening.sql` for any new permission rule.

## Before you finish

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:db` when SQL changed. CI runs all of them plus both builds.

Write user-facing text and docs in plain English with short sentences. Do not use em-dashes.
