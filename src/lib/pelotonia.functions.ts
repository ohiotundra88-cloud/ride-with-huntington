import { createServerFn } from "@tanstack/react-start";

export interface PelotoniaSubteam {
  name: string;
  total: number;
  raised: number;
  /** Not published per sub-team by Pelotonia; kept for layout compatibility. */
  riders: number | null;
  challengers: number | null;
  volunteers: number | null;
  committed: number | null;
  highRollers: number | null;
  survivors: number | null;
}

/**
 * Team Huntington totals. Fields Pelotonia's public data doesn't provide are
 * null, and the pages hide them rather than show a wrong number.
 */
export interface PelotoniaTeamData {
  teamName: string;
  raised: number;
  goal: number;
  allTimeRaised: number;
  kidsRaised: number | null;
  members: number;
  riders: number | null;
  challengers: number | null;
  volunteers: number | null;
  highRollers: number | null;
  survivors: number | null;
  donationsCount: number | null;
  totalCommitted: number | null;
  lastUpdated: string | null;
  subteams: PelotoniaSubteam[];
  recentDaily: { date: string; amount: number; count: number }[];
}

/**
 * Live Team Huntington fundraising figures, read server-side from Pelotonia's
 * public data (so the browser stays same-origin and VPN friendly).
 */
export const getPelotoniaTeamData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PelotoniaTeamData | null> => {
    const { fetchTeam } = await import("@/lib/pelotonia-api.server");
    const team = await fetchTeam();
    if (!team) return null;
    return {
      teamName: team.teamName,
      raised: team.raised,
      goal: team.goal,
      allTimeRaised: team.allTimeRaised,
      kidsRaised: null,
      members: team.members,
      riders: null,
      challengers: null,
      volunteers: null,
      highRollers: null,
      survivors: null,
      donationsCount: null,
      totalCommitted: null,
      lastUpdated: team.fetchedAt,
      subteams: team.subteams.map((s) => ({
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
  },
);

export interface RiderFundraising {
  publicId: string;
  name: string;
  raised: number;
  goal: number;
  committed: number;
  allTimeRaised: number;
  teamName: string;
  isHighRoller: boolean;
  isSurvivor: boolean;
  lastUpdated: string | null;
}

/**
 * Individual fundraising totals for one participant, looked up by their
 * Pelotonia public/rider ID (the value captured during registration).
 */
export const getRiderFundraising = createServerFn({ method: "GET" })
  .inputValidator((data: { publicId: string }) => ({
    publicId: String(data?.publicId ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<RiderFundraising | null> => {
    if (!data.publicId) return null;
    const { fetchRider } = await import("@/lib/pelotonia-api.server");
    const rider = await fetchRider(data.publicId);
    if (!rider) return null;
    return {
      publicId: rider.publicId,
      name: rider.name,
      raised: rider.raised,
      goal: rider.goal,
      committed: rider.committed,
      allTimeRaised: rider.allTimeRaised,
      teamName: rider.subTeam ? `Team Huntington Bank - ${rider.subTeam}` : "",
      isHighRoller: rider.isHighRoller,
      isSurvivor: rider.isSurvivor,
      lastUpdated: rider.fetchedAt,
    };
  });
