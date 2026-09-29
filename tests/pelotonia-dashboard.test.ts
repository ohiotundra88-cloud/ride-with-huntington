import { test } from "node:test";
import assert from "node:assert/strict";

const core = {
  overview: {
    team_name: "Team Huntington Bank",
    raised: 5_000_000,
    kids_raised: 150_000,
    goal: 6_000_000,
    all_time_raised: 50_000_000,
    members_count: 4000,
    riders: 2400,
    challengers: 500,
    volunteers: 1500,
    high_rollers: 160,
    cancer_survivors: 280,
    donations_count: 25_000,
    total_committed: 3_900_000,
    last_scraped: "2026-09-28T23:00:00Z",
  },
  teamBreakdown: [
    { name: "Team Huntington Bank - Audit", total: 36, official_raised: 0, total_raised: 20_000 },
    { name: "Team Huntington Bank - Human Resources", total: 98, official_raised: 139_000 },
  ],
  timeline: [1, 2, 3, 4, 5, 6, 7, 8].map((d) => ({
    date: `2026-09-2${d}`,
    daily_amount: d * 100,
    daily_count: d,
  })),
};

const members = [
  {
    public_id: "jg0075",
    name: "Jason Guyer",
    team_name: "Team Huntington Bank - Tech/M&A and Cyber",
    raised: 78_061.8,
    fundraising_goal: 5000,
    commitment_amount: 5000,
    all_time_raised: 136_140.72,
    committed_high_roller: 1,
    is_cancer_survivor: 0,
    is_captain: 0,
    is_rider: 1,
    is_volunteer: 1,
    is_challenger: 1,
    ride_type: '["signature", "gravel"]',
    route_names: "Trail Run/Hike, Sunday 27 Mile Loop",
    tags: '["15 years", "High Roller"]',
  },
];

let up = true;
globalThis.fetch = (async (input: string | URL | Request) => {
  if (!up) throw new Error("down");
  const url = String(input);
  const body = url.endsWith("/api/bundle/core") ? core : members;
  return new Response(JSON.stringify(body), { status: 200 });
}) as typeof fetch;

const { fetchDashboardTeam, fetchDashboardRiders } =
  await import("../src/lib/pelotonia-dashboard.server.ts");

test("team total includes Pelotonia Kids, like the dashboard headline", async () => {
  const t = await fetchDashboardTeam();
  assert.ok(t);
  assert.equal(t.raised, 5_150_000);
  assert.equal(t.allTimeRaised, 50_150_000);
  assert.equal(t.kidsRaised, 150_000);
  assert.equal(t.survivors, 280);
  assert.equal(t.donationsCount, 25_000);
});

test("sub-teams drop the team prefix, use the official total, sort by raised", async () => {
  const t = await fetchDashboardTeam();
  assert.deepEqual(
    t?.subteams.map((s) => [s.name, s.raised]),
    [
      ["Human Resources", 139_000],
      ["Audit", 20_000],
    ],
  );
  assert.equal(t?.recentDaily.length, 7);
  assert.equal(t?.recentDaily[0].date, "2026-09-28");
});

test("riders: JSON-text lists parsed, IDs upper-cased, flags read", async () => {
  const r = (await fetchDashboardRiders())?.get("JG0075");
  assert.ok(r);
  assert.equal(r.subTeam, "Tech/M&A and Cyber");
  assert.deepEqual(r.rideTypes, ["signature", "gravel"]);
  assert.deepEqual(r.routes, ["Trail Run/Hike", "Sunday 27 Mile Loop"]);
  assert.equal(r.isHighRoller, true);
  assert.equal(r.isSurvivor, false);
  assert.equal(r.committed, 5000);
});

test("cached for 10 minutes, so an outage right after a read still has numbers", async () => {
  up = false;
  assert.ok(await fetchDashboardTeam());
  up = true;
});
