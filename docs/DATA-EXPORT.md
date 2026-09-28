# Data export and restore runbook

How to take every piece of Hub data out of the temporary preview, restore it into Azure Database for PostgreSQL, check that nothing was lost, and move uploaded files from Cloudflare R2 to Azure Blob Storage. The last section is an honest look at SQL Server.

The database commands below were rehearsed end to end on PostgreSQL 17: dump, restore into an empty database, identical row counts on all 46 tables, and the 22 row-level security tests passing on the restored copy.

**The export contains personal data** (names, work emails, phone numbers, mailing addresses, travel details). Move it only through a channel Huntington approves, keep it encrypted at rest, and delete working copies when the move is verified.

## What there is to move

| Data                  | Where it lives in the preview                     | How it moves                              |
| --------------------- | ------------------------------------------------- | ----------------------------------------- |
| All application data  | PostgreSQL 17 (`public` and `auth` schemas)       | `pg_dump` custom format, `pg_restore`     |
| Uploaded files        | Cloudflare R2 bucket `ride-with-huntington-files` | `rclone` (or rclone plus `azcopy`)        |
| Sign-in sessions      | Cloudflare D1                                     | Not moved. People sign in again.          |
| Synced Pelotonia data | PostgreSQL (`pelotonia_*` tables)                 | Moves with the dump; the job refreshes it |

## Tools

Use PostgreSQL **17** client tools (`pg_dump`, `pg_restore`, `psql`). A newer `pg_dump` than the server is fine; an older one is not.

## 1. Export

Run on a machine that can reach the preview database (the builder does this and hands over the files). Set `SOURCE_URL` to a connection string for the preview database as a superuser or the database owner.

```sh
mkdir -p hub-export/csv && cd hub-export

# a) Full backup: schema, data, grants and RLS policies. This is the file you restore.
pg_dump "$SOURCE_URL" --format=custom --exclude-extension=pgcrypto --file=hub.dump

# b) Schema only, as readable SQL (for review and diffing).
pg_dump "$SOURCE_URL" --schema-only --exclude-extension=pgcrypto --file=hub-schema.sql

# c) One CSV per table (for inspection, spreadsheets, or loading elsewhere).
psql "$SOURCE_URL" -At -c "
  SELECT n.nspname || '.' || c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname IN ('public', 'auth') ORDER BY 1" |
while read -r t; do
  psql "$SOURCE_URL" -q -v ON_ERROR_STOP=1 -c "\copy $t TO 'csv/$t.csv' WITH (FORMAT csv, HEADER)" || echo "FAILED: $t"
done

# d) Row counts at export time, to compare after the restore.
cat > rowcounts.sql <<'SQL'
SELECT format('SELECT %L AS table_name, count(*) AS rows FROM %I.%I',
              n.nspname || '.' || c.relname, n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname IN ('public', 'auth')
ORDER BY 1 \gexec
SQL
psql "$SOURCE_URL" -At -F ' ' -f rowcounts.sql > rowcounts-source.txt

# e) Fingerprint the files you hand over.
shasum -a 256 hub.dump hub-schema.sql rowcounts-source.txt > SHA256SUMS
```

`--exclude-extension` needs `pg_dump` 17. `pgcrypto` is excluded because the Hub does not use it and Azure only allows extensions you list in `azure.extensions`.

Avoid writes while you export (the Hub has no maintenance mode, so export outside working hours and tell the preview's users) so the dump and the file copy describe the same moment.

## 2. Restore into Azure Database for PostgreSQL

Prepare the server as in [DEPLOYMENT.md](DEPLOYMENT.md#1-database-azure-database-for-postgresql-flexible-server), but **only create the roles**. Do not run the shim's schema part and do not run the migrations: the dump already contains the `auth` and `storage` schemas, every table, function, trigger, policy and grant.

The roles the dump expects: `anon`, `authenticated`, `service_role`, `authenticator`, `supabase_auth_admin`, `supabase_storage_admin`.

```sh
# Empty target database, roles already created.
pg_restore --dbname="$TARGET_URL" --no-owner --exit-on-error hub.dump
```

- `--no-owner` makes the restoring login own everything. If you use the owner fallback (your admin cannot grant `BYPASSRLS`), add `--role=service_role` so `service_role` owns everything instead.
- Keep privileges. Do **not** use `--no-privileges` or `--no-acl`: the grants to `anon` and `authenticated` are part of the security model.
- Do not restore data on top of a database built from the migrations. The migrations seed rows (FAQs, settings, allowlist) and create profiles from triggers, so a data-only restore stops with duplicate-key errors such as `faqs_source_id_key`. If you ever have to, start again from an empty database.

## 3. Verify

```sh
psql "$TARGET_URL" -At -F ' ' -f rowcounts.sql > rowcounts-target.txt
diff rowcounts-source.txt rowcounts-target.txt && echo "row counts identical"

# Row-level security still behaves (runs in a transaction and rolls back).
# The PGOPTIONS part is needed because Azure's admin login is not called "postgres".
PGOPTIONS='-c request.jwt.claims={"role":"service_role"}' \
  psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_hardening.sql
```

Then spot-check in the app: sign in as a known colleague, open their registration, a fundraiser, the approval queue and the vendor list.

## 4. Move uploaded files from R2 to Azure Blob

Every uploaded file is one object in the R2 bucket, keyed `<logical bucket>/<path>`. Keep the keys exactly the same in Blob Storage; the database stores `<path>` and the storage adapter adds the prefix.

| Key prefix            | Referenced from                                                                 |
| --------------------- | ------------------------------------------------------------------------------- |
| `avatars/`            | `profiles.avatar_path`                                                          |
| `branding/`           | `site_branding.logo_path`, `site_branding.hero_path`                            |
| `captain-docs/`       | `captain_posts.file_path`                                                       |
| `event-fliers/`       | `events.flier_path`, `fundraiser_requests.flier_path`, `fundraisers.flier_path` |
| `fundraising-assets/` | `fundraising_assets.file_path`                                                  |
| `vendor-files/`       | `vendor_attachments.file_path`                                                  |

(`fundraisers.cover_path` and `team_events.flier_path` exist in the schema but no code uploads to them today.)

### With rclone (one step, recommended)

rclone talks to both R2 (S3 API) and Azure Blob. Configure two remotes with environment variables so no credentials land in a config file:

```sh
# Cloudflare R2 (an R2 API token with read access to the bucket)
export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
export RCLONE_CONFIG_R2_ACCESS_KEY_ID=<r2 access key id>
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY=<r2 secret>

# Azure Blob (a short-lived container SAS URL with write access)
export RCLONE_CONFIG_AZ_TYPE=azureblob
export RCLONE_CONFIG_AZ_SAS_URL='https://<account>.blob.core.windows.net/hub-files?<sas>'

rclone copy r2:ride-with-huntington-files az: --progress --checkers 8 --transfers 8
rclone check r2:ride-with-huntington-files az: --size-only --one-way
rclone size r2:ride-with-huntington-files && rclone size az:
```

With a container-scoped SAS URL, the remote `az:` is the container itself.

### With azcopy (two steps)

azcopy cannot read from R2 directly. Copy R2 to a local folder with rclone first, then upload:

```sh
rclone copy r2:ride-with-huntington-files ./r2-files --progress
azcopy copy './r2-files/*' 'https://<account>.blob.core.windows.net/hub-files?<sas>' --recursive
```

### Check that every file the database mentions exists

```sh
psql "$TARGET_URL" -At -c "
  SELECT 'avatars/' || avatar_path FROM profiles WHERE avatar_path IS NOT NULL
  UNION ALL SELECT 'branding/' || logo_path FROM site_branding WHERE logo_path IS NOT NULL
  UNION ALL SELECT 'branding/' || hero_path FROM site_branding WHERE hero_path IS NOT NULL
  UNION ALL SELECT 'captain-docs/' || file_path FROM captain_posts WHERE file_path IS NOT NULL
  UNION ALL SELECT 'event-fliers/' || flier_path FROM events WHERE flier_path IS NOT NULL
  UNION ALL SELECT 'event-fliers/' || flier_path FROM fundraiser_requests WHERE flier_path IS NOT NULL
  UNION ALL SELECT 'event-fliers/' || flier_path FROM fundraisers WHERE flier_path IS NOT NULL
  UNION ALL SELECT 'fundraising-assets/' || file_path FROM fundraising_assets WHERE file_path IS NOT NULL
  UNION ALL SELECT 'vendor-files/' || file_path FROM vendor_attachments WHERE file_path IS NOT NULL
  ORDER BY 1" > referenced.txt
rclone lsf -R --files-only az: | sort > present.txt
comm -23 referenced.txt present.txt   # anything printed is missing from Blob
```

The app can only read these files once the Azure Blob storage adapter exists ([DEPLOYMENT.md](DEPLOYMENT.md#4-file-storage-on-azure)).

## 5. After the move

- Remove the builder's address from `hub_email_allowlist` and `hub_bootstrap_admins`, and add Huntington's admins ([ENTRA.md](ENTRA.md)).
- When switching to Entra ID, clear `auth.users.identity_subject` so people are matched by email on their first Entra sign-in ([ENTRA.md](ENTRA.md#cutover-from-aspire-identity)).
- Run the Pelotonia sync once to confirm it can write.
- Delete the working copies of the dump and CSVs.

## Could the Hub run on SQL Server instead?

Short answer: yes, but it is a port, not a migration. Recommendation: stay on PostgreSQL. Azure Database for PostgreSQL Flexible Server is a first-party Azure managed service with the same backup, high availability, private networking and Entra integration Huntington expects of Azure SQL.

What would have to change:

| Area                   | Today (PostgreSQL)                                                                                      | On SQL Server                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security model         | About 114 RLS policies across 45 tables, using `auth.uid()` from the request's JWT claims               | SQL Server has row-level security, but through inline table-valued predicate functions and security policies. Every policy is rewritten, and the user id would come from `SESSION_CONTEXT`. |
| Data API               | PostgREST (PostgreSQL only)                                                                             | No drop-in equivalent. Microsoft's Data API builder has a different URL and query syntax, so supabase-js cannot talk to it.                                                                 |
| App data layer         | supabase-js query builder, about 380 `.from()` / `.rpc()` calls, plus the browser proxy                 | Rewrite every call with a SQL Server client or ORM, and regenerate types.                                                                                                                   |
| Functions and triggers | 32 functions and 32 triggers in PL/pgSQL (11 `SECURITY DEFINER`), including sign-in and approval guards | Rewrite in T-SQL. `SECURITY DEFINER` becomes `EXECUTE AS` or signed modules.                                                                                                                |
| Types                  | `uuid`, `timestamptz`, `jsonb` (17 columns), arrays (7 columns), one enum (`app_role`), `text`          | `uniqueidentifier`, `datetimeoffset`, `nvarchar(max)` with JSON functions, junction tables for arrays, a lookup table or check constraint for the enum.                                     |
| Upserts and SQL idioms | `ON CONFLICT`, `RETURNING`, regex checks (`~*`), partial and expression indexes                         | `MERGE`, `OUTPUT`, CLR or `LIKE` patterns, filtered and computed-column indexes.                                                                                                            |
| Migrations and tests   | 50 migrations, SQL security tests, CI on PostgreSQL 17                                                  | New baseline script in T-SQL, security tests rewritten, CI on a SQL Server container.                                                                                                       |

Effort, for an engineer who knows both databases: roughly 2 to 4 months. About 3 to 5 weeks to translate the schema, functions and security policies; 4 to 8 weeks to rewrite the data layer; 2 to 3 weeks of testing, with the security tests rebuilt first. The main risk is subtle authorization differences, which is exactly what the current RLS tests guard against.
