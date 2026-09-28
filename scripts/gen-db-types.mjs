#!/usr/bin/env node
/**
 * Regenerates the Tables and Views sections of
 * src/integrations/supabase/types.ts from a live PostgreSQL schema, in the
 * same shape supabase-js expects. Functions, Enums and CompositeTypes are
 * left as they are.
 *
 * Usage (after `supabase/tests/local/reset.sh` has built the local DB):
 *   node scripts/gen-db-types.mjs            # defaults to the local test DB
 *   DATABASE_URL=postgres://... node scripts/gen-db-types.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/integrations/supabase/types.ts";
const url =
  process.env.DATABASE_URL ??
  `postgresql://postgres@localhost:${process.env.PGPORT ?? 54329}/${process.env.PGDATABASE_TEST ?? "rwh_test"}?host=${process.env.PGHOST ?? "/tmp"}`;

function query(sql) {
  const out = execFileSync(
    process.env.PSQL ?? "psql",
    [url, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
    {
      encoding: "utf8",
      env: { ...process.env, LC_ALL: process.env.LC_ALL ?? "en_US.UTF-8" },
    },
  );
  return JSON.parse(out.trim() || "[]");
}

const columns = query(`
  select coalesce(json_agg(c order by c.table_name, c.column_name), '[]') from (
    select c.table_name, c.column_name, c.is_nullable = 'YES' as nullable,
           c.column_default is not null or c.is_identity = 'YES' or c.is_generated = 'ALWAYS' as has_default,
           c.data_type, c.udt_name, t.table_type
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
  ) c`);

const enums = new Set(
  query(`select coalesce(json_agg(t.typname), '[]') from pg_type t join pg_namespace n on n.oid = t.typnamespace
         where n.nspname = 'public' and t.typtype = 'e'`),
);

const fks = query(`
  select coalesce(json_agg(f order by f.table_name, f.name), '[]') from (
    select c.conname as name, rel.relname as table_name, frel.relname as ref_table,
           (select json_agg(a.attname order by k.ord) from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols,
           (select json_agg(a.attname order by k.ord) from unnest(c.confkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as ref_cols,
           exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indisunique
                     and (i.indkey::int2[])::int[] @> c.conkey::int[] and array_length(c.conkey, 1) = i.indnkeyatts) as one_to_one,
           nf.nspname as ref_schema
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid join pg_namespace n on n.oid = rel.relnamespace
    join pg_class frel on frel.oid = c.confrelid join pg_namespace nf on nf.oid = frel.relnamespace
    where c.contype = 'f' and n.nspname = 'public'
  ) f`);

function tsType(col) {
  const base = (udt) => {
    if (enums.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
    if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(udt)) return "number";
    if (udt === "bool") return "boolean";
    if (udt === "json" || udt === "jsonb") return "Json";
    return "string";
  };
  if (col.data_type === "ARRAY") return `${base(col.udt_name.replace(/^_/, ""))}[]`;
  return base(col.udt_name);
}

const indent = (n) => " ".repeat(n);
const byTable = new Map();
for (const c of columns) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, { type: c.table_type, cols: [] });
  byTable.get(c.table_name).cols.push(c);
}

function relationships(table, pad) {
  const rels = fks.filter((f) => f.table_name === table && f.ref_schema === "public");
  if (!rels.length) return `${indent(pad)}Relationships: []`;
  const items = rels.map(
    (f) =>
      `${indent(pad + 2)}{\n` +
      `${indent(pad + 4)}foreignKeyName: "${f.name}"\n` +
      `${indent(pad + 4)}columns: [${f.cols.map((c) => `"${c}"`).join(", ")}]\n` +
      `${indent(pad + 4)}isOneToOne: ${f.one_to_one}\n` +
      `${indent(pad + 4)}referencedRelation: "${f.ref_table}"\n` +
      `${indent(pad + 4)}referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(", ")}]\n` +
      `${indent(pad + 2)}},`,
  );
  return `${indent(pad)}Relationships: [\n${items.join("\n")}\n${indent(pad)}]`;
}

function block(name, fields, pad) {
  return `${indent(pad)}${name}: {\n${fields.map((f) => `${indent(pad + 2)}${f}`).join("\n")}\n${indent(pad)}}`;
}

function tableEntry(name, { cols }) {
  const row = cols.map((c) => `${c.column_name}: ${tsType(c)}${c.nullable ? " | null" : ""}`);
  const insert = cols.map(
    (c) =>
      `${c.column_name}${c.nullable || c.has_default ? "?" : ""}: ${tsType(c)}${c.nullable ? " | null" : ""}`,
  );
  const update = cols.map((c) => `${c.column_name}?: ${tsType(c)}${c.nullable ? " | null" : ""}`);
  return [
    `      ${name}: {`,
    block("Row", row, 8),
    block("Insert", insert, 8),
    block("Update", update, 8),
    relationships(name, 8),
    `      }`,
  ].join("\n");
}

function viewEntry(name, { cols }) {
  const row = cols.map((c) => `${c.column_name}: ${tsType(c)} | null`);
  return [`      ${name}: {`, block("Row", row, 8), relationships(name, 8), `      }`].join("\n");
}

const tables = [...byTable]
  .filter(([, t]) => t.type === "BASE TABLE")
  .sort(([a], [b]) => a.localeCompare(b));
const views = [...byTable]
  .filter(([, t]) => t.type === "VIEW")
  .sort(([a], [b]) => a.localeCompare(b));
const tablesTs = `    Tables: {\n${tables.map(([n, t]) => tableEntry(n, t)).join("\n")}\n    }`;
const viewsTs = views.length
  ? `    Views: {\n${views.map(([n, t]) => viewEntry(n, t)).join("\n")}\n    }`
  : `    Views: {\n      [_ in never]: never\n    }`;

const src = readFileSync(FILE, "utf8");
const pub = src.indexOf("  public: {");
const tStart = src.indexOf("    Tables: {", pub);
const vStart = src.indexOf("    Views: {", tStart);
const fStart = src.indexOf("    Functions: {", vStart);
if (pub < 0 || tStart < 0 || vStart < 0 || fStart < 0)
  throw new Error("Unexpected types.ts layout");
const out = src.slice(0, tStart) + tablesTs + "\n" + viewsTs + "\n" + src.slice(fStart);
writeFileSync(FILE, out);
console.log(`types.ts: ${tables.length} tables, ${views.length} views`);
