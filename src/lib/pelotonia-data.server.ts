/**
 * Team Huntington Pelotonia data for the Hub's pages.
 *
 * Reads the local copy kept fresh by jobs/pelotonia-sync (nightly), and falls
 * back to Pelotonia's live public data for anything the copy doesn't have yet
 * (a rider who registered today, or before the first sync has finished).
 */
import { createDbClient } from "@/server/backend.server";
import {
  fetchRiders,
  fetchTeam,
  normalizePublicId,
  TEAM_PELOTON_ID,
  type PelotoniaRider,
} from "@/lib/pelotonia-api.server";

export interface TeamOverview {
  teamName: string;
  raised: number;
  goal: number;
  allTimeRaised: number;
  /** Pelotonia Kids money raised on PledgeIt (already included in raised and allTimeRaised). */
  kidsRaised: number | null;
  members: number;
  riders: number | null;
  challengers: number | null;
  volunteers: number | null;
  highRollers: number | null;
  survivors: number | null;
  totalCommitted: number | null;
  lastUpdated: string | null;
  subteams: {
    name: string;
    total: number;
    raised: number;
    riders: number | null;
    challengers: number | null;
    volunteers: number | null;
    committed: number | null;
    highRollers: number | null;
    survivors: number | null;
  }[];
  /** Day-over-day change in the team total, newest first (from nightly snapshots). */
  recentDaily: { date: string; amount: number; count: number }[];
}

type Row = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v));

// Loose client type: these tables aren't in the Lovable-generated types.
function db() {
  return createDbClient("service_role") as unknown as {
    from(table: string): {
      select(cols: string): {
        eq(col: string, v: string): { maybeSingle(): Promise<{ data: Row | null }> };
        in(col: string, v: string[]): Promise<{ data: Row[] | null }>;
        order(
          col: string,
          o: { ascending: boolean },
        ): { limit(n: number): Promise<{ data: Row[] | null }> };
      } & Promise<{ data: Row[] | null }>;
    };
  };
}

/** Profiles are considered synced once most riders have one. */
const MIN_PROFILE_SHARE = 0.9;

export async function teamOverview(): Promise<TeamOverview | null> {
  try {
    const client = db();
    const [
      { data: team },
      { data: statsRows },
      { data: subs },
      { data: snaps },
      { data: kidsRows },
    ] = await Promise.all([
      client.from("pelotonia_pelotons").select("*").eq("id", TEAM_PELOTON_ID).maybeSingle(),
      client.from("pelotonia_team_stats").select("*"),
      client.from("pelotonia_subteam_stats").select("*"),
      client
        .from("pelotonia_team_snapshots")
        .select("snapshot_date, raised, kids_raised")
        .order("snapshot_date", { ascending: false })
        .limit(9),
      client.from("pelotonia_kids_campaigns").select("raised"),
    ]);
    if (team) {
      const stats = statsRows?.[0] ?? {};
      const profilesComplete =
        n(stats.members) > 0 && n(stats.profiles_synced) / n(stats.members) >= MIN_PROFILE_SHARE;
      const count = (v: unknown) => (profilesComplete ? n(v) : null);
      const daily = (snaps ?? []).map((s) => ({
        date: String(s.snapshot_date),
        raised: n(s.raised) + n(s.kids_raised),
      }));
      // Team totals include Pelotonia Kids, matching Pelotonia's team dashboard.
      const kids = kidsRows?.length ? kidsRows.reduce((t, k) => t + n(k.raised), 0) : null;
      return {
        teamName: String(team.name ?? "Team Huntington Bank"),
        raised: n(team.raised) + (kids ?? 0),
        goal: n(team.goal),
        allTimeRaised: n(team.all_time_raised) + (kids ?? 0),
        kidsRaised: kids,
        members: n(team.members_count),
        riders: count(stats.riders),
        challengers: count(stats.challengers),
        volunteers: count(stats.volunteers),
        highRollers: count(stats.high_rollers),
        survivors: count(stats.survivors),
        totalCommitted: profilesComplete ? n(stats.total_committed) : null,
        lastUpdated: String(team.synced_at ?? "") || null,
        subteams: (subs ?? [])
          .map((s) => ({
            name: String(s.name ?? ""),
            total: n(s.members_count),
            raised: n(s.raised),
            riders: count(s.riders),
            challengers: count(s.challengers),
            volunteers: count(s.volunteers),
            committed: profilesComplete ? n(s.committed) : null,
            highRollers: count(s.high_rollers),
            survivors: count(s.survivors),
          }))
          .sort((a, b) => b.raised - a.raised),
        recentDaily: daily
          .slice(0, -1)
          .map((d, i) => ({ date: d.date, amount: d.raised - daily[i + 1].raised, count: 0 })),
      };
    }
  } catch (e) {
    console.error("[pelotonia] local copy unavailable:", e instanceof Error ? e.message : e);
  }

  const live = await fetchTeam();
  if (!live) return null;
  return {
    teamName: live.teamName,
    raised: live.raised,
    goal: live.goal,
    allTimeRaised: live.allTimeRaised,
    kidsRaised: null,
    members: live.members,
    riders: null,
    challengers: null,
    volunteers: null,
    highRollers: null,
    survivors: null,
    totalCommitted: null,
    lastUpdated: live.fetchedAt,
    subteams: live.subteams.map((s) => ({
      name: s.name,
      total: s.members,
      raised: s.raised,
      riders: null,
      challengers: null,
      volunteers: null,
      committed: null,
      highRollers: null,
      survivors: null,
    })),
    recentDaily: [],
  };
}

function fromRow(r: Row): PelotoniaRider {
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const peloton = (r.pelotonia_pelotons ?? null) as Row | null;
  return {
    publicId: String(r.public_id),
    name: String(r.name ?? ""),
    subTeam: peloton?.short_name ? String(peloton.short_name) : null,
    isCaptain: !!r.is_captain,
    isRider: !!r.is_rider,
    isVolunteer: !!r.is_volunteer,
    isChallenger: !!r.is_challenger,
    rideTypes: list(r.ride_types),
    routes: list(r.route_names),
    tags: list(r.tags),
    raised: n(r.raised),
    goal: n(r.goal),
    committed: n(r.commitment),
    isHighRoller: !!r.is_high_roller,
    isSurvivor: !!r.is_survivor,
    allTimeRaised: n(r.all_time_raised),
    fetchedAt: String(r.profile_synced_at ?? r.list_synced_at ?? ""),
  };
}

/** Riders by Pelotonia public ID: local copy first, live lookups for the rest. */
export async function ridersByPublicId(publicIds: unknown[]): Promise<Map<string, PelotoniaRider>> {
  const ids = [...new Set(publicIds.map(normalizePublicId).filter((v): v is string => !!v))];
  const out = new Map<string, PelotoniaRider>();
  if (!ids.length) return out;
  try {
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await db()
        .from("pelotonia_riders")
        .select("*, pelotonia_pelotons(short_name)")
        .in("public_id", ids.slice(i, i + 200));
      for (const r of data ?? []) if (r.profile_synced_at) out.set(String(r.public_id), fromRow(r));
    }
  } catch (e) {
    console.error("[pelotonia] local copy unavailable:", e instanceof Error ? e.message : e);
  }
  const missing = ids.filter((id) => !out.has(id));
  if (missing.length) for (const [id, r] of await fetchRiders(missing)) out.set(id, r);
  return out;
}

export async function riderByPublicId(publicId: string): Promise<PelotoniaRider | null> {
  const id = normalizePublicId(publicId);
  if (!id) return null;
  return (await ridersByPublicId([id])).get(id) ?? null;
}
