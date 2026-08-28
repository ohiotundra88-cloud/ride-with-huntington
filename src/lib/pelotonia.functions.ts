import { createServerFn } from "@tanstack/react-start";

const DASHBOARD_BASE = "https://pelotonia-dashboard-401340053598.us-central1.run.app";

export interface PelotoniaSubteam {
  name: string;
  riders: number;
  challengers: number;
  volunteers: number;
  total: number;
  raised: number;
  committed: number;
  highRollers: number;
  survivors: number;
}

export interface PelotoniaTeamData {
  teamName: string;
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
  subteams: PelotoniaSubteam[];
  recentDaily: { date: string; amount: number; count: number }[];
}

/**
 * Live Team Huntington fundraising figures from the Pelotonia dashboard.
 * Source data refreshes at 7 AM, 1 PM and 7 PM daily.
 * Fetched server-side so the browser stays same-origin (VPN friendly).
 */
export const getPelotoniaTeamData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PelotoniaTeamData | null> => {
    try {
      const res = await fetch(`${DASHBOARD_BASE}/api/bundle/core`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        overview?: Record<string, number | string | null>;
        teamBreakdown?: Record<string, number | string | null>[];
        timeline?: { date: string; daily_amount: number; daily_count: number }[];
      };
      const o = json.overview;
      if (!o) return null;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

      const subteams: PelotoniaSubteam[] = (json.teamBreakdown ?? [])
        .map((t) => ({
          name: String(t["name"] ?? "").replace(/^Team Huntington Bank\s*-\s*/, ""),
          riders: num(t["riders"]),
          challengers: num(t["challengers"]),
          volunteers: num(t["volunteers"]),
          total: num(t["total"]),
          raised: num(t["official_raised"]) || num(t["total_raised"]),
          committed: num(t["total_committed"]),
          highRollers: num(t["high_rollers"]),
          survivors: num(t["survivors"]),
        }))
        .sort((a, b) => b.raised - a.raised);

      const recentDaily = (json.timeline ?? [])
        .slice(-7)
        .reverse()
        .map((d) => ({ date: d.date, amount: num(d.daily_amount), count: num(d.daily_count) }));

      return {
        teamName: String(o["team_name"] ?? "Team Huntington Bank"),
        // Dashboard headline total includes Pelotonia Kids funds
        raised: num(o["raised"]) + num(o["kids_raised"]),
        goal: num(o["goal"]),
        allTimeRaised: num(o["all_time_raised"]) + num(o["kids_raised"]),
        kidsRaised: num(o["kids_raised"]),
        members: num(o["members_count"]),
        riders: num(o["riders"]),
        challengers: num(o["challengers"]),
        volunteers: num(o["volunteers"]),
        highRollers: num(o["high_rollers"]),
        survivors: num(o["cancer_survivors"]),
        donationsCount: num(o["donations_count"]),
        totalCommitted: num(o["total_committed"]),
        lastUpdated: typeof o["last_scraped"] === "string" ? o["last_scraped"] : null,
        subteams,
        recentDaily,
      };
    } catch {
      return null;
    }
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
    try {
      const res = await fetch(`${DASHBOARD_BASE}/api/members`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as Record<string, unknown>[];
      const wanted = data.publicId.toLowerCase();
      const row = rows.find(
        (r) => String(r["public_id"] ?? "").trim().toLowerCase() === wanted,
      );
      if (!row) return null;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
      return {
        publicId: String(row["public_id"] ?? data.publicId),
        name: String(row["name"] ?? ""),
        raised: num(row["raised"]),
        goal: num(row["fundraising_goal"]) || num(row["personal_goal"]),
        committed: num(row["commitment_amount"]) || num(row["committed_amount"]),
        allTimeRaised: num(row["all_time_raised"]),
        teamName: String(row["team_name"] ?? ""),
        isHighRoller: num(row["committed_high_roller"]) === 1,
        isSurvivor: num(row["is_cancer_survivor"]) === 1,
        lastUpdated: typeof row["last_scraped"] === "string" ? (row["last_scraped"] as string) : null,
      };
    } catch {
      return null;
    }
  });
