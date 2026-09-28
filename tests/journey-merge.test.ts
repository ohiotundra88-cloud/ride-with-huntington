import { test } from "node:test";
import assert from "node:assert/strict";
import type { Registration } from "../src/lib/store.tsx";
import { defaultAdminState } from "../src/lib/admin-content.ts";
import {
  formatDeadline,
  mergeReadinessWithRegistration,
  mergeTimelineWithRegistration,
} from "../src/lib/journey-merge.ts";

function registration(over: Partial<Registration> = {}): Registration {
  return {
    id: null,
    participation: "rider",
    pelotonia: { confirmation: "", hbNumber: "", completed: false, status: "not_started" },
    travel: { needs: "", status: "not_started" },
    bike: { needs: "", status: "not_started" },
    apparel: { status: "not_started" },
    address: {},
    submittedAt: null,
    audit: [],
    ...over,
  } as unknown as Registration;
}

const defaults = defaultAdminState("2026-09-28T00:00:00.000Z");
const step = (items: ReturnType<typeof mergeReadinessWithRegistration>, id: string) =>
  items.find((i) => i.id === id)!;

test("deadlines format as short dates and reject bad input", () => {
  assert.equal(formatDeadline("2027-07-22"), "Jul 22");
  assert.equal(formatDeadline(""), null);
  assert.equal(formatDeadline(undefined), null);
  assert.equal(formatDeadline("2027-02-30"), null);
  assert.equal(formatDeadline("July 22"), null);
});

test("travel guidance has no date unless an admin sets a deadline", () => {
  const plain = mergeReadinessWithRegistration(defaults.readiness, registration());
  assert.equal(step(plain, "hotel").detail, "Add your travel and hotel plans.");

  const withDeadline = defaults.readiness.map((r) =>
    r.id === "hotel" ? { ...r, deadline: "2027-07-01" } : r,
  );
  const merged = mergeReadinessWithRegistration(withDeadline, registration());
  assert.equal(step(merged, "hotel").detail, "Add your travel and hotel plans by Jul 1.");
});

test("without live fundraising data the step shows no progress and no weight", () => {
  const seeded = defaults.readiness.map((r) =>
    r.id === "fundraising" ? { ...r, progressCurrent: 3800, progressGoal: 5000 } : r,
  );
  const f = step(mergeReadinessWithRegistration(seeded, registration(), null), "fundraising");
  assert.equal(f.weight, 0);
  assert.equal(f.progressCurrent, undefined);
  assert.equal(f.progressGoal, undefined);
  assert.match(f.detail, /Rider ID/);
});

test("live fundraising totals drive progress and completion", () => {
  const live = { raised: 1200, committed: 1200, goal: 1500 };
  const f = step(
    mergeReadinessWithRegistration(defaults.readiness, registration(), live),
    "fundraising",
  );
  assert.equal(f.status, "complete");
  assert.equal(f.progressCurrent, 1200);
  assert.equal(f.progressGoal, 1200);
});

test("the Pelotonia timeline step is completed only when the answers say so", () => {
  const pending = mergeTimelineWithRegistration(defaults.timeline, registration());
  assert.equal(pending.find((t) => t.id === "t-1")!.state, "current");

  const done = registration({
    pelotonia: {
      confirmation: "12345",
      hbNumber: "",
      completed: true,
      status: "complete",
    } as Registration["pelotonia"],
  });
  const t1 = mergeTimelineWithRegistration(defaults.timeline, done).find((t) => t.id === "t-1")!;
  assert.equal(t1.state, "completed");
  assert.match(t1.instructions ?? "", /12345/);
});

test("riders bringing their own bike see the bike step as done", () => {
  const reg = registration({ bike: { needs: "no" } as Registration["bike"] });
  const bike = mergeTimelineWithRegistration(defaults.timeline, reg).find((t) => t.id === "t-2")!;
  assert.equal(bike.state, "completed");
  assert.equal(bike.title, "Bring your own bike");
});
