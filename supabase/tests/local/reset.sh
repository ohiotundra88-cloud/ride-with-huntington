#!/usr/bin/env bash
# Rebuild a throwaway local database from every migration. Usage: supabase/tests/local/reset.sh
set -euo pipefail
export LC_ALL=${LC_ALL:-en_US.UTF-8}
PSQL=${PSQL:-psql}; HOST=${PGHOST:-/tmp}; PORT=${PGPORT:-54329}; DB=${PGDATABASE_TEST:-rwh_test}
root=$(cd "$(dirname "$0")/../../.." && pwd)
$PSQL -h "$HOST" -p "$PORT" -U postgres -q -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
$PSQL -h "$HOST" -p "$PORT" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f "$root/supabase/tests/local/00_supabase_shim.sql"
for f in "$root"/supabase/migrations/*.sql; do
  $PSQL -h "$HOST" -p "$PORT" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null || { echo "FAILED: $(basename "$f")"; exit 1; }
done
echo "ok: $(ls "$root"/supabase/migrations/*.sql | wc -l | tr -d ' ') migrations applied to $DB"
