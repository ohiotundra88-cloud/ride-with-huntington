#!/usr/bin/env node
/**
 * Runs sync.mjs once a day at SYNC_AT (24h "HH:MM", default 03:30) in TZ
 * (set TZ=America/New_York on the container), plus once at start-up if the
 * last successful run is older than 20 hours. Intended as a container's
 * long-running command; any cron or Azure scheduled job can call sync.mjs
 * directly instead.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const [hh, mm] = (process.env.SYNC_AT ?? "03:30").split(":").map(Number);
const log = (...a) => console.log(new Date().toISOString(), "[scheduler]", ...a);

function runSync() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "sync.mjs")], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function msUntilNext() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function lastSuccessAgeHours() {
  try {
    const { createHmac } = await import("node:crypto");
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const h = b64({ alg: "HS256", typ: "JWT" });
    const p = b64({ role: "service_role", iat: now, exp: now + 60 });
    const s = createHmac("sha256", process.env.HUB_DB_JWT_SECRET)
      .update(`${h}.${p}`)
      .digest("base64url");
    const res = await fetch(
      `${process.env.HUB_REST_URL}/pelotonia_sync_runs?select=finished_at&status=in.(succeeded,partial)&order=finished_at.desc&limit=1`,
      { headers: { Authorization: `Bearer ${h}.${p}.${s}` } },
    );
    const [row] = await res.json();
    return row?.finished_at ? (Date.now() - Date.parse(row.finished_at)) / 3600_000 : Infinity;
  } catch {
    return Infinity;
  }
}

if ((await lastSuccessAgeHours()) > 20) {
  log("last successful sync is stale; running now");
  log("exit", await runSync());
}
for (;;) {
  const wait = msUntilNext();
  log(`next run in ${Math.round(wait / 60000)} min`);
  await new Promise((r) => setTimeout(r, wait));
  log("exit", await runSync());
}
