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
 * Team Huntington fundraising figures: the nightly local copy of Pelotonia's
 * public data, falling back to a live read (server-side, VPN friendly).
 */
export const getPelotoniaTeamData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PelotoniaTeamData | null> => {
    const { teamOverview } = await import("@/lib/pelotonia-data.server");
    const team = await teamOverview();
    return team ? { ...team, donationsCount: null } : null;
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
  .validator((data: { publicId: string }) => ({
    publicId: String(data?.publicId ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<RiderFundraising | null> => {
    if (!data.publicId) return null;
    const { riderByPublicId } = await import("@/lib/pelotonia-data.server");
    const rider = await riderByPublicId(data.publicId);
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
