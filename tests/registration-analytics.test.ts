import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchesRole,
  outstandingActions,
  summarizeRegistrations,
  type RegistrationRecord,
} from "../src/lib/registration-analytics.ts";

function record(over: Partial<RegistrationRecord> = {}): RegistrationRecord {
  return {
    participation: null,
    region: null,
    reg_id: null,
    submitted_at: null,
    pelotonia: {},
    travel: {},
    bike: {},
    apparel: {},
    address: {},
    ...over,
  };
}

const doneRider = record({
  participation: "rider",
  region: "Columbus",
  submitted_at: "2026-09-01T00:00:00Z",
  pelotonia: { confirmation: "111", status: "complete" },
  travel: { needs: "hotel", hotelName: "Somewhere", status: "complete" },
  bike: { needs: "yes", bikeType: "Road", bikeSize: "M", status: "complete" },
  apparel: { jerseySize: "M", status: "complete" },
});
const newVolunteer = record({ participation: "volunteer", region: "Cleveland" });
const undecided = record();

test("an empty roster summarises to zeros", () => {
  const s = summarizeRegistrations([]);
  assert.equal(s.total, 0);
  assert.equal(s.averageCompletion, 0);
  assert.deepEqual(outstandingActions(s), []);
});

test("roles, submissions and requests are counted from the answers", () => {
  const s = summarizeRegistrations([doneRider, newVolunteer, undecided]);
  assert.equal(s.total, 3);
  assert.equal(s.submitted, 1);
  assert.deepEqual(s.roles, { rider: 1, volunteer: 1, challenger: 0, unsure: 0, notChosen: 1 });
  assert.equal(s.hotelRequests, 1);
  assert.equal(s.bikeRentals, 1);
});

test("steps only count people they apply to", () => {
  const s = summarizeRegistrations([doneRider, newVolunteer, undecided]);
  assert.deepEqual(s.steps.bike, { applicable: 1, complete: 1, pending: 0, notStarted: 0 });
  assert.equal(s.steps.pelotonia.applicable, 3);
  assert.equal(s.steps.pelotonia.complete, 1);
});

test("a legacy 'both' registration counts as a rider and a volunteer", () => {
  const s = summarizeRegistrations([record({ participation: "both" })]);
  assert.equal(s.roles.rider, 1);
  assert.equal(s.roles.volunteer, 1);
  assert.equal(s.steps.bike.applicable, 1);
});

test("completion bands and regions reflect each person's readiness", () => {
  const s = summarizeRegistrations([doneRider, newVolunteer, undecided]);
  assert.equal(s.completionBands[0].count, 1); // fully ready
  assert.equal(
    s.completionBands.reduce((n, b) => n + b.count, 0),
    3,
  );
  const columbus = s.regions.find((r) => r.region === "Columbus")!;
  assert.equal(columbus.averageCompletion, 100);
  assert.ok(s.regions.some((r) => r.region === "No region on profile"));
});

test("outstanding actions name only unfinished steps, in plain English", () => {
  const actions = outstandingActions(summarizeRegistrations([doneRider, newVolunteer, undecided]));
  assert.deepEqual(actions, [
    "1 person hasn't chosen how they're taking part",
    "2 people haven't confirmed their Pelotonia registration",
    "2 people haven't finished travel and hotel",
    "2 people haven't finished apparel",
  ]);
});

test("role filters follow participation", () => {
  assert.ok(matchesRole(doneRider, "riders"));
  assert.ok(!matchesRole(newVolunteer, "riders"));
  assert.ok(matchesRole(newVolunteer, "volunteers"));
  assert.ok(matchesRole(undecided, "all"));
});
