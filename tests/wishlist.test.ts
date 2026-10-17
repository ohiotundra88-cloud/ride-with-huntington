import { test } from "node:test";
import assert from "node:assert/strict";
import { isKidsSupporter, tierFor, tierForAmount, yearTotals } from "../src/lib/vendors.shared.ts";
import {
  initialMarketingStatus,
  isFullyApproved,
  requestInputSchema,
  type FundraiserRequest,
} from "../src/lib/fundraiser-requests.shared.ts";
import {
  apparelStatus,
  bikeStatus,
  needsTravelAndApparel,
  travelStatus,
} from "../src/lib/registration-progress.ts";

// Vendor tiers -----------------------------------------------------------------
const cases: [number, string | null][] = [
  [0, null],
  [4999.99, null],
  [5000, "green_honeycomb"],
  [14999, "green_honeycomb"],
  [15000, "gold_honeycomb"],
  [29999, "gold_honeycomb"],
  [30000, "one_goal"],
  [49999, "one_goal"],
  [50000, "pinnacle"],
  [250000, "pinnacle"],
];
for (const [amount, key] of cases) {
  test(`$${amount} -> ${key ?? "no tier"}`, () =>
    assert.equal(tierForAmount(amount)?.key ?? null, key));
}

test("a commitment counts before the money arrives; the larger of the two is used", () => {
  const t = yearTotals([{ year: 2027, committed_amount: 30000, actual_donated_amount: 10000 }]);
  assert.equal(t[2027].total, 30000);
  assert.equal(tierFor(t, 2027)?.label, "One Goal");
});

test("Pelotonia Kids donations count toward the tier and earn the Kids badge", () => {
  const t = yearTotals([
    { year: 2027, committed_amount: 45000, actual_donated_amount: 45000, kids_amount: 5000 },
  ]);
  assert.equal(t[2027].total, 50000);
  assert.equal(tierFor(t, 2027)?.key, "pinnacle");
  assert.equal(isKidsSupporter(t, 2027), true);
  assert.equal(isKidsSupporter(t, 2026), false);
});

test("tiers are per year, not lifetime", () => {
  const t = yearTotals([
    { year: 2026, committed_amount: 20000, actual_donated_amount: 20000 },
    { year: 2027, committed_amount: 20000, actual_donated_amount: 20000 },
  ]);
  assert.equal(tierFor(t, 2027)?.key, "gold_honeycomb");
});

test("Pinnacle includes 5 rider slots with hotel; One Goal 2 without", () => {
  assert.deepEqual([tierForAmount(50000)?.riderSlots, tierForAmount(50000)?.slotHotel], [5, true]);
  assert.deepEqual([tierForAmount(30000)?.riderSlots, tierForAmount(30000)?.slotHotel], [2, false]);
  assert.equal(tierForAmount(15000)?.riderSlots, 0);
});

// Fundraiser request questions ---------------------------------------------------
const base = {
  captain_id: "00000000-0000-4000-8000-000000000001",
  title: "Trivia night",
  description: "A trivia night for Team Huntington.",
  event_type: "in_person" as const,
  event_date: "2027-03-01",
  on_huntington_property: false,
  serves_alcohol: false,
  serves_food: false,
  uses_logos: true,
  contract_needed: false,
  liability_waiver_needed: false,
};
const issues = (v: Record<string, unknown>) => {
  const r = requestInputSchema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0]));
};

test("a complete request passes", () => assert.deepEqual(issues(base), []));
test("every yes/no question must be answered", () => {
  const { contract_needed: _omit, ...rest } = base;
  assert.deepEqual(issues(rest), ["contract_needed"]);
});
test("Huntington property needs the facilities answer", () => {
  assert.deepEqual(issues({ ...base, on_huntington_property: true }), ["facilities_approved"]);
  assert.deepEqual(
    issues({ ...base, on_huntington_property: true, facilities_approved: false }),
    [],
  );
});
test("alcohol needs a description", () => {
  assert.deepEqual(issues({ ...base, serves_alcohol: true }), ["alcohol_details"]);
  assert.deepEqual(
    issues({
      ...base,
      serves_alcohol: true,
      alcohol_details: "Beer and wine by the venue's bartender",
    }),
    [],
  );
});
test("serving food requires agreeing colleagues won't serve it", () => {
  assert.deepEqual(
    issues({ ...base, serves_food: true, food_policy_acknowledged: false, food_truck: false }),
    ["food_policy_acknowledged"],
  );
  assert.deepEqual(
    issues({ ...base, serves_food: true, food_policy_acknowledged: true, food_truck: false }),
    [],
  );
});
test("food needs the food truck answer", () => {
  assert.deepEqual(issues({ ...base, serves_food: true, food_policy_acknowledged: true }), [
    "food_truck",
  ]);
});
test("food trucks can't be hosted on Huntington property", () => {
  const food = { serves_food: true, food_policy_acknowledged: true, food_truck: true };
  assert.deepEqual(issues({ ...base, ...food }), []);
  assert.deepEqual(
    issues({ ...base, ...food, on_huntington_property: true, facilities_approved: true }),
    ["food_truck"],
  );
});
test("raffle is an event type", () =>
  assert.deepEqual(issues({ ...base, event_type: "raffle" }), []));

test("no logos means Marketing isn't needed", () => {
  assert.equal(initialMarketingStatus(false), "not_required");
  assert.equal(initialMarketingStatus(true), "pending");
  assert.equal(initialMarketingStatus(null), "pending");
});

test("a request with Marketing not required is fully approved once the rest sign off", () => {
  const r = {
    captain_status: "approved",
    legal_status: "approved",
    risk_status: "approved",
    compliance_status: "approved",
    marketing_status: "not_required",
    cochair_status: "approved",
  } as FundraiserRequest;
  assert.equal(isFullyApproved(r), true);
  assert.equal(isFullyApproved({ ...r, cochair_status: "pending" } as FundraiserRequest), false);
});

// Challengers ------------------------------------------------------------------
test("challengers skip bike, travel/hotel and apparel", () => {
  const reg = { participation: "challenger", travel: {}, bike: {}, apparel: {} } as never;
  assert.equal(needsTravelAndApparel("challenger"), false);
  assert.equal(needsTravelAndApparel("rider"), true);
  assert.equal(needsTravelAndApparel("volunteer"), true);
  assert.equal(travelStatus(reg), "complete");
  assert.equal(bikeStatus(reg), "complete");
  assert.equal(apparelStatus(reg), "complete");
  const rider = { participation: "rider", travel: {}, bike: {}, apparel: {} } as never;
  assert.equal(apparelStatus(rider), "not_started");
});
