/**
 * Reads Team Huntington data straight from Pelotonia's public data service —
 * the same one my.pelotonia.org uses for its public team and rider pages.
 * No sign-in or key is needed, and nothing here writes to Pelotonia.
 *
 * This service is not an official, documented feed, so it can change without
 * notice. Everything here fails soft (returns null) and the Hub keeps working
 * without live numbers. Responses are cached in memory so page views don't
 * turn into a flood of requests to Pelotonia.
 */

const API_BASE = (
  process.env.PELOTONIA_API_BASE ??
  "https://pelotonia-p3-middleware-production.azurewebsites.net/api"
).replace(/\/+$/, "");

/** Team Huntington Bank's top-level ("Super") peloton on my.pelotonia.org. */
export const TEAM_PELOTON_ID = process.env.PELOTONIA_TEAM_PELOTON_ID ?? "a0s3t00000BKX8sAAH";

const CACHE_MS = 10 * 60_000;
const TIMEOUT_MS = 8_000;
/**
 * Most uncached riders one request will look up. Each rider is two calls
 * (profile + routes), so this keeps a request within Worker subrequest limits.
 */
const MAX_FRESH_LOOKUPS = 20;
const CONCURRENCY = 6;

const cache = new Map<string, { at: number; value: unknown }>();

async function getJson<T>(path: string): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T | null;
  try {
    const res = await fetch(`${API_BASE}/${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // A missing rider is a real answer worth caching; other errors are not.
    if (res.status === 404) {
      cache.set(path, { at: Date.now(), value: null });
      return null;
    }
    if (!res.ok) return null;
    const value = (await res.json()) as T;
    cache.set(path, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const TEAM_PREFIX = /^Team Huntington Bank\s*-\s*/;

interface ApiPeloton {
  id: string;
  name: string;
  membersCount?: number;
  fundraising?: { raised?: number; goal?: number; allTimeRaised?: number };
}

interface ApiSubPeloton {
  name: string;
  publicId: string;
  raised?: number;
  membersCount?: number;
}

interface ApiRider {
  publicId: string;
  firstName?: string;
  lastName?: string;
  registrationTypes?: string[];
  participantTypes?: {
    isRider?: boolean;
    isVolunteer?: boolean;
    isChallenger?: boolean;
    registeredRides?: { rideType?: string }[];
  };
  tags?: { name?: string }[];
  peloton?: { id?: string; name?: string; isCaptain?: boolean } | null;
  fundraising?: {
    raised?: number;
    goal?: number;
    committedAmount?: number;
    committedHighRoller?: boolean;
    allTimeRaised?: number;
  };
}

export interface PelotoniaTeam {
  teamName: string;
  raised: number;
  goal: number;
  allTimeRaised: number;
  members: number;
  subteams: { name: string; members: number; raised: number }[];
  fetchedAt: string;
}

export interface PelotoniaRider {
  publicId: string;
  name: string;
  /** Sub-peloton name with the "Team Huntington Bank - " prefix removed. */
  subTeam: string | null;
  isCaptain: boolean;
  isRider: boolean;
  isVolunteer: boolean;
  isChallenger: boolean;
  rideTypes: string[];
  /** Registered route names, e.g. "Saturday 46 Miles". */
  routes: string[];
  tags: string[];
  raised: number;
  goal: number;
  committed: number;
  isHighRoller: boolean;
  /** Pelotonia's public "Living Proof" badge. */
  isSurvivor: boolean;
  allTimeRaised: number;
  fetchedAt: string;
}

export async function fetchTeam(): Promise<PelotoniaTeam | null> {
  const [team, subs] = await Promise.all([
    getJson<ApiPeloton>(`peloton/${TEAM_PELOTON_ID}`),
    getJson<ApiSubPeloton[]>(`peloton/${TEAM_PELOTON_ID}/members`),
  ]);
  if (!team?.fundraising) return null;
  return {
    teamName: team.name || "Team Huntington Bank",
    raised: num(team.fundraising.raised),
    goal: num(team.fundraising.goal),
    allTimeRaised: num(team.fundraising.allTimeRaised),
    members: num(team.membersCount),
    subteams: (Array.isArray(subs) ? subs : [])
      .map((s) => ({
        name: String(s.name ?? "").replace(TEAM_PREFIX, ""),
        members: num(s.membersCount),
        raised: num(s.raised),
      }))
      .sort((a, b) => b.raised - a.raised),
    fetchedAt: new Date().toISOString(),
  };
}

function toRider(r: ApiRider, routes: { name?: string }[] | null): PelotoniaRider {
  const tags = (r.tags ?? []).map((t) => String(t.name ?? "")).filter(Boolean);
  const types = r.participantTypes ?? {};
  const f = r.fundraising ?? {};
  return {
    publicId: r.publicId,
    name: [r.firstName, r.lastName].filter(Boolean).join(" "),
    subTeam: r.peloton?.name ? r.peloton.name.replace(TEAM_PREFIX, "") : null,
    isCaptain: !!r.peloton?.isCaptain,
    isRider: !!types.isRider,
    isVolunteer: !!types.isVolunteer,
    isChallenger: !!types.isChallenger,
    rideTypes: [
      ...new Set(
        (types.registeredRides ?? []).map((x) => String(x.rideType ?? "")).filter(Boolean),
      ),
    ],
    routes: (Array.isArray(routes) ? routes : []).map((x) => String(x.name ?? "")).filter(Boolean),
    tags,
    raised: num(f.raised),
    goal: num(f.goal),
    committed: num(f.committedAmount),
    isHighRoller: !!f.committedHighRoller || tags.includes("High Roller"),
    isSurvivor: tags.includes("Living Proof"),
    allTimeRaised: num(f.allTimeRaised),
    fetchedAt: new Date().toISOString(),
  };
}

/** Pelotonia public IDs look like "CK0132". Anything else is ignored. */
export function normalizePublicId(value: unknown): string | null {
  const id = String(value ?? "")
    .trim()
    .toUpperCase();
  return /^[A-Z0-9]{3,12}$/.test(id) ? id : null;
}

export async function fetchRider(publicId: string): Promise<PelotoniaRider | null> {
  const id = normalizePublicId(publicId);
  if (!id) return null;
  const [r, routes] = await Promise.all([
    getJson<ApiRider>(`user/${encodeURIComponent(id)}`),
    getJson<{ name?: string }[]>(`user/${encodeURIComponent(id)}/routes`),
  ]);
  return r?.publicId ? toRider(r, routes) : null;
}

/**
 * Looks up many riders. Cached riders are always returned; at most
 * MAX_FRESH_LOOKUPS uncached riders are fetched per call, so a large roster
 * fills in over a few page loads instead of hitting request limits.
 */
export async function fetchRiders(publicIds: unknown[]): Promise<Map<string, PelotoniaRider>> {
  const ids = [...new Set(publicIds.map(normalizePublicId).filter((v): v is string => !!v))];
  const cachedFirst = ids.sort(
    (a, b) => Number(!isFresh(`user/${a}`)) - Number(!isFresh(`user/${b}`)),
  );
  let freshBudget = MAX_FRESH_LOOKUPS;
  const todo = cachedFirst.filter((id) => isFresh(`user/${id}`) || freshBudget-- > 0);

  const out = new Map<string, PelotoniaRider>();
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const riders = await Promise.all(batch.map((id) => fetchRider(id)));
    riders.forEach((r, j) => {
      if (r) out.set(batch[j], r);
    });
  }
  return out;
}

function isFresh(path: string) {
  const hit = cache.get(path);
  return !!hit && Date.now() - hit.at < CACHE_MS;
}
