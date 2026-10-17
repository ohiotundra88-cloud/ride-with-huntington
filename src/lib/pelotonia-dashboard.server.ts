/**
 * Reads Team Huntington numbers from the Pelotonia team dashboard (a Cloud Run
 * service a Huntington colleague runs). This is the source the original Hub
 * used, and its figures are the ones the team already reports and compares
 * against, so the Hub shows them first.
 *
 * The dashboard scrapes Pelotonia several times a day. It is not ours and has
 * no SLA, so everything here fails soft (returns null) and the callers fall
 * back to the Hub's own nightly copy of Pelotonia's public data.
 */

const DASHBOARD_BASE = (
  process.env.PELOTONIA_DASHBOARD_BASE ??
  "https://pelotonia-dashboard-401340053598.us-central1.run.app"
).replace(/\/+$/, "");

const CACHE_MS = 10 * 60_000;
const TIMEOUT_MS = 10_000;
const TEAM_PREFIX = /^Team Huntington Bank\s*-\s*/;

const cache = new Map<string, { at: number; value: unknown }>();

async function getJson<T>(path: string): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  try {
    const res = await fetch(`${DASHBOARD_BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const value = (await res.json()) as T;
    cache.set(path, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

type Row = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** The dashboard stores some lists as JSON text ('["Rider"]'), some as plain text. */
function list(v: unknown, separator?: string): string[] {
  if (Array.isArray(v)) return v.map(String);
  const s = String(v ?? "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through and treat it as plain text
    }
  }
  return separator
    ? s
        .split(separator)
        .map((x) => x.trim())
        .filter(Boolean)
    : [s];
}

export interface DashboardTeam {
  teamName: string;
  /** Team total including Pelotonia Kids, as the dashboard headline shows it. */
  raised: number;
  goal: number;
  allTimeRaised: number;
  kidsRaised: number;
  members: number;
  riders: number;
  challengers: number;
  volunteers: number;
  highRollers: number;
  survivors: number;
  donationsCount: number;
  totalCommitted: number;
  lastUpdated: string | null;
  subteams: {
    name: string;
    total: number;
    raised: number;
    riders: number;
    challengers: number;
    volunteers: number;
    committed: number;
    highRollers: number;
    survivors: number;
  }[];
  recentDaily: { date: string; amount: number; count: number }[];
}

export async function fetchDashboardTeam(): Promise<DashboardTeam | null> {
  const json = await getJson<{
    overview?: Row;
    teamBreakdown?: Row[];
    timeline?: { date: string; daily_amount: number; daily_count: number }[];
  }>("/api/bundle/core");
  const o = json?.overview;
  if (!o || !num(o.raised)) return null;
  return {
    teamName: String(o.team_name ?? "Team Huntington Bank"),
    raised: num(o.raised) + num(o.kids_raised),
    goal: num(o.goal),
    allTimeRaised: num(o.all_time_raised) + num(o.kids_raised),
    kidsRaised: num(o.kids_raised),
    members: num(o.members_count),
    riders: num(o.riders),
    challengers: num(o.challengers),
    volunteers: num(o.volunteers),
    highRollers: num(o.high_rollers),
    survivors: num(o.cancer_survivors),
    donationsCount: num(o.donations_count),
    totalCommitted: num(o.total_committed),
    lastUpdated: typeof o.last_scraped === "string" ? o.last_scraped : null,
    subteams: (json.teamBreakdown ?? [])
      .map((t) => ({
        name: String(t.name ?? "").replace(TEAM_PREFIX, ""),
        total: num(t.total),
        raised: num(t.official_raised) || num(t.total_raised),
        riders: num(t.riders),
        challengers: num(t.challengers),
        volunteers: num(t.volunteers),
        committed: num(t.total_committed),
        highRollers: num(t.high_rollers),
        survivors: num(t.survivors),
      }))
      .sort((a, b) => b.raised - a.raised),
    recentDaily: (json.timeline ?? [])
      .slice(-7)
      .reverse()
      .map((d) => ({ date: d.date, amount: num(d.daily_amount), count: num(d.daily_count) })),
  };
}

export interface DashboardRider {
  publicId: string;
  name: string;
  subTeam: string | null;
  isCaptain: boolean;
  isRider: boolean;
  isVolunteer: boolean;
  isChallenger: boolean;
  rideTypes: string[];
  routes: string[];
  tags: string[];
  raised: number;
  goal: number;
  committed: number;
  isHighRoller: boolean;
  isSurvivor: boolean;
  allTimeRaised: number;
  fetchedAt: string;
}

let membersAt = "";

/** Every Team Huntington member the dashboard knows, keyed by upper-case public ID. */
export async function fetchDashboardRiders(): Promise<Map<string, DashboardRider> | null> {
  const fresh = !cache.has("/api/members");
  const rows = await getJson<Row[]>("/api/members");
  if (!Array.isArray(rows) || !rows.length) return null;
  if (fresh || !membersAt) membersAt = new Date().toISOString();
  const out = new Map<string, DashboardRider>();
  for (const r of rows) {
    const id = String(r.public_id ?? "")
      .trim()
      .toUpperCase();
    if (!id) continue;
    const tags = list(r.tags);
    const team = String(r.team_name ?? "");
    out.set(id, {
      publicId: id,
      name: String(r.name ?? ""),
      subTeam: team ? team.replace(TEAM_PREFIX, "") : null,
      isCaptain: num(r.is_captain) === 1,
      isRider: num(r.is_rider) === 1,
      isVolunteer: num(r.is_volunteer) === 1,
      isChallenger: num(r.is_challenger) === 1,
      rideTypes: list(r.ride_type),
      routes: list(r.route_names, ","),
      tags,
      raised: num(r.raised),
      goal: num(r.fundraising_goal) || num(r.personal_goal),
      committed: num(r.commitment_amount) || num(r.committed_amount),
      isHighRoller: num(r.committed_high_roller) === 1 || tags.includes("High Roller"),
      isSurvivor: num(r.is_cancer_survivor) === 1,
      allTimeRaised: num(r.all_time_raised),
      fetchedAt: membersAt,
    });
  }
  return out;
}
