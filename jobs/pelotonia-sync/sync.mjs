#!/usr/bin/env node
/**
 * Pelotonia sync: copies Team Huntington's public Pelotonia data into the Hub.
 *
 * Reads Pelotonia's public data service (the one my.pelotonia.org uses for its
 * public team and rider pages) and writes to the Hub database through PostgREST
 * as the service role. Zero dependencies; Node 22+.
 *
 * Environment:
 *   HUB_REST_URL         PostgREST base URL, e.g. http://rest:3000 (required)
 *   HUB_DB_JWT_SECRET    secret PostgREST uses to verify tokens (required)
 *   PELOTONIA_API_BASE   default https://pelotonia-p3-middleware-production.azurewebsites.net/api
 *   PELOTONIA_TEAM_PELOTON_ID  default a0s3t00000BKX8sAAH (Team Huntington Bank)
 *   SYNC_PROFILES        "all" (default) | "stale" (only profiles older than 20h) | "none"
 *   SYNC_MAX_PROFILES    cap on profiles per run (default: no cap)
 *   PLEDGEIT_KIDS_SLUGS  comma-separated PledgeIt campaign slugs for Pelotonia Kids
 *                        (default PelotoniaKids-TeamHuntington; "" to skip)
 *
 * Politeness: at most 3 requests in flight, 150 ms between request starts
 * per worker, 20 s timeout each, 3 retries with backoff on 429/5xx.
 */
import { createHmac } from "node:crypto";

const API = (
  process.env.PELOTONIA_API_BASE ??
  "https://pelotonia-p3-middleware-production.azurewebsites.net/api"
).replace(/\/+$/, "");
const TEAM = process.env.PELOTONIA_TEAM_PELOTON_ID ?? "a0s3t00000BKX8sAAH";
const REST = requiredEnv("HUB_REST_URL").replace(/\/+$/, "");
const SECRET = requiredEnv("HUB_DB_JWT_SECRET");
const PROFILE_MODE = process.env.SYNC_PROFILES ?? "all";
const MAX_PROFILES = Number(process.env.SYNC_MAX_PROFILES ?? Infinity);
const CONCURRENCY = 3;
const GAP_MS = 150;
const PAGE_SIZE = 200;
const UA = "TeamHuntingtonHub-PelotoniaSync/1.0";
const KIDS_SLUGS = (process.env.PLEDGEIT_KIDS_SLUGS ?? "PelotoniaKids-TeamHuntington")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let requests = 0;
let errors = 0;

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(2);
  }
  return v;
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const shortName = (name) =>
  String(name ?? "").replace(/^Team Huntington Bank\s*-\s*/, "") || String(name ?? "");

// ---------------------------------------------------------------- Pelotonia

async function pelotonia(path, { page } = {}) {
  const headers = { Accept: "application/json", "User-Agent": UA };
  if (page) {
    headers["pagination-page"] = String(page);
    headers["pagination-limit"] = String(PAGE_SIZE);
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    requests++;
    try {
      const res = await fetch(`${API}/${path}`, { headers, signal: AbortSignal.timeout(20_000) });
      if (res.status === 404) return { data: null, pages: 0 };
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { final: true });
      const data = await res.json();
      return { data, pages: Number(res.headers.get("pagination-count") ?? 1) };
    } catch (e) {
      if (e.final || attempt === 4) {
        errors++;
        log(`WARN ${path}: ${e.message}`);
        return { data: null, pages: 0 };
      }
      await sleep(1000 * 2 ** attempt);
    }
  }
  return { data: null, pages: 0 };
}

// ---------------------------------------------------------------- PledgeIt (Pelotonia Kids)

/**
 * Reads one public PledgeIt campaign page. PledgeIt has no public API; the
 * page embeds its data as Next.js JSON (__NEXT_DATA__), which is what we parse.
 * Returns null (and counts an error) if the page or its shape changed.
 */
async function pledgeItCampaign(slug) {
  const url = `https://charity.pledgeit.org/${encodeURIComponent(slug)}`;
  requests++;
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html", "User-Agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("no __NEXT_DATA__");
    const data = JSON.parse(m[1])?.props?.apolloState?.data ?? {};
    const c = Object.values(data).find(
      (v) => v?.__typename === "Campaign" && String(v.slug).toLowerCase() === slug.toLowerCase(),
    );
    const raised = Number(c?.amountRaised ?? c?.stats?.estimatedAmountRaised);
    if (!c || !Number.isFinite(raised)) throw new Error("campaign total not found");
    return {
      slug,
      name: String(c.campaignHeadline ?? c.name ?? slug),
      raised,
      goal: Number.isFinite(Number(c.monetaryGoal)) ? Number(c.monetaryGoal) : null,
      url,
      synced_at: new Date().toISOString(),
    };
  } catch (e) {
    errors++;
    log(`WARN pledgeit ${slug}: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------- Hub database

function serviceToken() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ role: "service_role", iat: now, exp: now + 600 });
  const sig = createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

async function rest(method, path, body, prefer) {
  const res = await fetch(`${REST}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${serviceToken()}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok)
    throw new Error(`DB ${method} ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function upsert(table, rows, chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    await rest(
      "POST",
      table,
      rows.slice(i, i + chunk),
      "resolution=merge-duplicates,return=minimal",
    );
  }
}

// ---------------------------------------------------------------- mapping

function pelotonRow(p, parentId) {
  const f = p.fundraising ?? {};
  return {
    id: p.id ?? p.publicId,
    parent_id: parentId,
    name: String(p.name ?? ""),
    short_name: shortName(p.name),
    level: str(p.level),
    current_event: str(p.currentEventName),
    members_count: num(p.membersCount),
    raised: num(f.raised ?? p.raised),
    goal: num(f.goal),
    all_time_raised: num(f.allTimeRaised),
    general_peloton_funds: num(f.generalPelotonFunds),
    raised_by_members: num(f.totalRaisedByMembers),
    captain_name: str(
      p.captain?.name ?? [p.captain?.firstName, p.captain?.lastName].filter(Boolean).join(" "),
    ),
    raw: { ...p, story: undefined },
    synced_at: new Date().toISOString(),
  };
}

function riderListRow(m, pelotonId) {
  return {
    public_id: String(m.publicId).toUpperCase(),
    peloton_id: pelotonId,
    name: String(m.name ?? ""),
    is_captain: !!m.isCaptain,
    is_peloton_admin: !!m.isAdmin,
    is_survivor: !!m.isCancerSurvivor,
    is_researcher: !!m.isPelotoniaResearcher,
    raised: num(m.raised),
    goal: num(m.fundraisingGoal),
    commitment: num(m.commitmentAmount),
    profile_image_url: str(m.profileImageUrl),
    list_synced_at: new Date().toISOString(),
  };
}

function profileRow(base, u, routes) {
  const types = u.participantTypes ?? {};
  const f = u.fundraising ?? {};
  const tags = (u.tags ?? []).map((t) => String(t?.name ?? "")).filter(Boolean);
  const routeList = Array.isArray(routes) ? routes : [];
  return {
    ...base,
    first_name: str(u.firstName),
    last_name: str(u.lastName),
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || base.name,
    is_rider: !!types.isRider,
    is_volunteer: !!types.isVolunteer,
    is_challenger: !!types.isChallenger,
    is_survivor: base.is_survivor || tags.includes("Living Proof"),
    is_high_roller: !!f.committedHighRoller || tags.includes("High Roller"),
    registration_types: (u.registrationTypes ?? []).map(String),
    ride_types: [
      ...new Set(
        (types.registeredRides ?? []).map((r) => String(r?.rideType ?? "")).filter(Boolean),
      ),
    ],
    route_ids: routeList.map((r) => String(r.id)).filter(Boolean),
    route_names: routeList.map((r) => String(r.name ?? "")).filter(Boolean),
    tags,
    raised: num(f.raised),
    goal: num(f.goal),
    commitment: num(f.committedAmount),
    all_time_raised: num(f.allTimeRaised),
    current_event: str(u.currentEventName),
    profile_synced_at: new Date().toISOString(),
    // Stories can be long; keep them out of the stored copy.
    raw_profile: { ...u, story: undefined },
  };
}

function rideRow(r) {
  const t = (v) => str(v);
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: t(r.type),
    is_signature: !!r.isSignatureRide,
    status: t(r.status),
    registration_start: t(r.registrationStartDate),
    registration_end: t(r.registrationEndDate),
    volunteer_registration_start: t(r.volunteerRegistrationStartDate),
    volunteer_registration_end: t(r.volunteerRegistrationEndDate),
    weekend_start: t(r.rideWeekendStartDate),
    weekend_end: t(r.rideWeekendEndDate),
    withdraw_deadline: t(r.rideWithdrawDeadline),
    lower_distance_deadline: t(r.lowerRouteDistanceDeadline),
    registration_fees: Array.isArray(r.registrationFees) ? r.registrationFees : [],
    synced_at: new Date().toISOString(),
  };
}

function routeRow(r) {
  return {
    id: String(r.id),
    ride_id: r.ride?.id ? String(r.ride.id) : null,
    name: String(r.name ?? ""),
    distance: typeof r.distance === "number" ? r.distance : null,
    duration: str(r.duration),
    difficulty: str(r.difficulty),
    start_date: str(r.startDate),
    fundraising_commitment:
      typeof r.fundraisingCommitment === "number" ? r.fundraisingCommitment : null,
    capacity: typeof r.capacity === "number" ? r.capacity : null,
    registration_count: typeof r.registrationCount === "number" ? r.registrationCount : null,
    highest_incline: typeof r.highestIncline === "number" ? r.highestIncline : null,
    description: str(r.description),
    map_url: str(r.mapUrl),
    image_url: str(r.imageUrl),
    tags: (r.tags ?? []).map((t) => String(t?.name ?? t)).filter(Boolean),
    synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- run

async function pool(items, worker) {
  let next = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
      await sleep(GAP_MS);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const [run] = await rest(
    "POST",
    "pelotonia_sync_runs",
    { status: "running" },
    "return=representation",
  );
  const stats = { pelotons: 0, riders_listed: 0, profiles_fetched: 0 };
  let status = "succeeded";
  let note = null;
  try {
    // 1. Team and sub-teams
    const { data: team } = await pelotonia(`peloton/${TEAM}`);
    if (!team?.id) throw new Error("Team peloton not found");
    await upsert("pelotonia_pelotons", [pelotonRow(team, null)]);
    const { data: subs } = await pelotonia(`peloton/${TEAM}/members`, { page: 1 });
    const subIds = (subs ?? [])
      .filter((s) => s.membersCount > 0 || s.publicId?.startsWith("a0"))
      .map((s) => s.publicId);
    const subRows = [];
    for (const id of subIds) {
      const { data } = await pelotonia(`peloton/${id}`);
      if (data?.id) subRows.push(pelotonRow(data, team.id));
      await sleep(GAP_MS);
    }
    await upsert("pelotonia_pelotons", subRows);
    stats.pelotons = 1 + subRows.length;
    log(`pelotons: ${stats.pelotons}`);

    // 2. Members of every sub-team (paged)
    const listed = new Map();
    for (const sub of subRows) {
      for (let page = 1; ; page++) {
        const { data, pages } = await pelotonia(`peloton/${sub.id}/members`, { page });
        for (const m of data ?? [])
          if (m.publicId && !(m.membersCount > 0))
            listed.set(String(m.publicId).toUpperCase(), riderListRow(m, sub.id));
        if (!data?.length || page >= pages) break;
        await sleep(GAP_MS);
      }
    }
    stats.riders_listed = listed.size;
    await upsert("pelotonia_riders", [...listed.values()]);
    log(`riders listed: ${listed.size}`);

    // 3. Each rider's public profile + registered routes
    if (PROFILE_MODE !== "none") {
      let ids = [...listed.keys()];
      if (PROFILE_MODE === "stale") {
        const cutoff = new Date(Date.now() - 20 * 3600_000).toISOString();
        const fresh = await rest(
          "GET",
          `pelotonia_riders?select=public_id&profile_synced_at=gte.${cutoff}`,
        );
        const skip = new Set((fresh ?? []).map((r) => r.public_id));
        ids = ids.filter((id) => !skip.has(id));
      }
      ids = ids.slice(0, MAX_PROFILES);
      const rides = new Map();
      const routes = new Map();
      let batch = [];
      const flush = async () => {
        if (!batch.length) return;
        const rows = batch;
        batch = [];
        await upsert("pelotonia_riders", rows, 200);
      };
      await pool(ids, async (id) => {
        const [{ data: u }, { data: r }] = await Promise.all([
          pelotonia(`user/${encodeURIComponent(id)}`),
          pelotonia(`user/${encodeURIComponent(id)}/routes`),
        ]);
        if (!u?.publicId) return;
        for (const route of Array.isArray(r) ? r : []) {
          if (route?.ride?.id) rides.set(route.ride.id, rideRow(route.ride));
          if (route?.id) routes.set(route.id, routeRow(route));
        }
        batch.push(profileRow(listed.get(id), u, r));
        stats.profiles_fetched++;
        if (batch.length >= 100) await flush();
        if (stats.profiles_fetched % 250 === 0)
          log(`profiles: ${stats.profiles_fetched}/${ids.length}`);
      });
      await flush();
      await upsert("pelotonia_rides", [...rides.values()]);
      await upsert("pelotonia_routes", [...routes.values()]);
      log(`profiles: ${stats.profiles_fetched}, rides: ${rides.size}, routes: ${routes.size}`);
    }

    // 4. Pelotonia Kids totals from PledgeIt
    const kids = (await Promise.all(KIDS_SLUGS.map(pledgeItCampaign))).filter(Boolean);
    if (kids.length) await upsert("pelotonia_kids_campaigns", kids);
    // Sum the stored rows for the configured campaigns, so one failed read keeps last night's figure.
    const slugList = KIDS_SLUGS.map((s) => `"${s}"`).join(",");
    const kidsRows = KIDS_SLUGS.length
      ? await rest(
          "GET",
          `pelotonia_kids_campaigns?select=raised&slug=in.(${encodeURIComponent(slugList)})`,
        )
      : [];
    const kidsTotal = kidsRows.reduce((t, k) => t + num(Number(k.raised)), 0);
    log(`pelotonia kids: ${kids.length}/${KIDS_SLUGS.length} campaigns, $${kidsTotal}`);

    // 5. Daily snapshot for the fundraising history
    const [counts] = await rest("GET", "pelotonia_team_stats?select=*");
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
      new Date(),
    );
    await upsert("pelotonia_team_snapshots", [
      {
        snapshot_date: day,
        raised: num(team.fundraising?.raised),
        kids_raised: kidsTotal,
        goal: num(team.fundraising?.goal),
        members_count: num(team.membersCount),
        riders: counts?.riders ?? 0,
        volunteers: counts?.volunteers ?? 0,
        challengers: counts?.challengers ?? 0,
        high_rollers: counts?.high_rollers ?? 0,
        survivors: counts?.survivors ?? 0,
        captured_at: new Date().toISOString(),
      },
    ]);
    if (errors) status = "partial";
  } catch (e) {
    status = "failed";
    note = e instanceof Error ? e.message : String(e);
    log(`FAILED: ${note}`);
  }
  await rest(
    "PATCH",
    `pelotonia_sync_runs?id=eq.${run.id}`,
    { ...stats, status, note, requests, errors, finished_at: new Date().toISOString() },
    "return=minimal",
  );
  log(`done: ${status}, ${requests} requests, ${errors} errors`);
  return status === "failed" ? 1 : 0;
}

process.exitCode = await main();
