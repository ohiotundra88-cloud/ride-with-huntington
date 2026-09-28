import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_CONTENT_VERSION,
  LEGACY_FIELDS,
  defaultAdminState,
  migrateStoredAdminState,
  readinessScore,
  type EditableReadinessItem,
} from "../src/lib/admin-content.ts";
import { contentFingerprint } from "../src/lib/content-fingerprint.ts";

const NOW = "2026-09-28T12:00:00.000Z";

// Default content -------------------------------------------------------------
test("default content has no announcements, goals or notifications", () => {
  const s = defaultAdminState(NOW);
  assert.deepEqual(s.announcements, []);
  assert.deepEqual(s.goals, []);
  assert.deepEqual(s.notifications, []);
  assert.equal(s.contentVersion, ADMIN_CONTENT_VERSION);
});

test("default content carries no invented amounts, phone numbers or deadlines", () => {
  const text = JSON.stringify(defaultAdminState(NOW));
  for (const marker of ["555-", "$", "Jul 22", "Demo Admin", "PELO-", "sample", "Hilton"]) {
    assert.ok(!text.includes(marker), `default content contains "${marker}"`);
  }
});

test("default readiness steps show no progress and score zero", () => {
  const s = defaultAdminState(NOW);
  assert.ok(s.readiness.every((r) => r.progressCurrent === undefined));
  assert.equal(readinessScore(s.readiness), 0);
});

// Fingerprints ----------------------------------------------------------------
test("fingerprints ignore fields outside the list and change with content", () => {
  const a = { id: "x", title: "Hello", order: 1 };
  assert.equal(
    contentFingerprint(a, ["id", "title"]),
    contentFingerprint({ ...a, order: 9 }, ["id", "title"]),
  );
  assert.notEqual(
    contentFingerprint(a, ["id", "title"]),
    contentFingerprint({ ...a, title: "Hello!" }, ["id", "title"]),
  );
  assert.match(contentFingerprint(a, ["id"]), /^[0-9a-f]{8}$/);
});

// Migrating stored copies -------------------------------------------------------
const prototypeBanner = {
  id: "a-1",
  headline: "Hotel block closes Jul 22",
  body: "Book your room at the Hilton Columbus Downtown before the group rate closes.",
  icon: "hotel",
  audience: "all",
  publishAt: NOW,
  expireAt: "",
  pinned: true,
  dismissible: true,
  publish: "published",
  updatedAt: NOW,
  updatedBy: "Demo Admin",
};

test("the prototype hotel banner saved in a browser is removed on load", () => {
  const out = migrateStoredAdminState({ announcements: [prototypeBanner] }, defaultAdminState(NOW));
  assert.deepEqual(out.announcements, []);
});

test("announcements an admin created or edited are kept", () => {
  const mine = { ...prototypeBanner, id: "a-mine", headline: "Kickoff call Wednesday" };
  const edited = { ...prototypeBanner, body: "Real hotel details from the team." };
  const out = migrateStoredAdminState({ announcements: [mine, edited] }, defaultAdminState(NOW));
  assert.deepEqual(
    out.announcements.map((a) => a.headline),
    ["Kickoff call Wednesday", "Hotel block closes Jul 22"],
  );
});

test("untouched legacy items are replaced by the default with the same id, or dropped", () => {
  const defaults = defaultAdminState(NOW);
  const oldStep = { ...defaults.readiness[0], detail: "Old invented detail" };
  const oldTimeline = { ...defaults.timeline[0], id: "t-gone", title: "Old event" };
  const legacy = new Set([
    contentFingerprint(oldStep, LEGACY_FIELDS.readiness),
    contentFingerprint(oldTimeline, LEGACY_FIELDS.timeline),
  ]);
  const out = migrateStoredAdminState(
    { readiness: [oldStep], timeline: [oldTimeline] },
    defaults,
    legacy,
  );
  assert.deepEqual(out.readiness, [defaults.readiness[0]]);
  assert.deepEqual(out.timeline, []);
});

test("current-version copies are not scrubbed, and flags and copy are preserved", () => {
  const defaults = defaultAdminState(NOW);
  const saved = {
    contentVersion: ADMIN_CONTENT_VERSION,
    announcements: [prototypeBanner],
    flags: { concierge: false },
    journeyCopy: { heroEyebrow: "Welcome back" },
  };
  const out = migrateStoredAdminState(saved, defaults);
  assert.equal(out.announcements.length, 1);
  assert.equal(out.flags.concierge, false);
  assert.equal(out.flags.familyMode, true);
  assert.equal(out.journeyCopy.heroEyebrow, "Welcome back");
  assert.equal(out.journeyCopy.timelineHeading, defaults.journeyCopy.timelineHeading);
});

test("the integration registry always comes from code", () => {
  const defaults = defaultAdminState(NOW);
  const out = migrateStoredAdminState(
    { apiManaged: [{ key: "weather", label: "Live weather", source: "NOAA" }] },
    defaults,
  );
  assert.deepEqual(out.apiManaged, defaults.apiManaged);
});

test("unreadable storage falls back to the defaults", () => {
  const defaults = defaultAdminState(NOW);
  assert.deepEqual(migrateStoredAdminState(null, defaults), defaults);
  assert.deepEqual(migrateStoredAdminState("nonsense", defaults), defaults);
});

// Readiness score ---------------------------------------------------------------
test("readiness score weights completed steps and gives partial fundraising credit", () => {
  const base = defaultAdminState(NOW).readiness;
  const items: EditableReadinessItem[] = base.map((r) =>
    r.id === "pelotonia"
      ? { ...r, status: "complete" }
      : r.id === "fundraising"
        ? { ...r, status: "in_progress", progressCurrent: 500, progressGoal: 1000 }
        : r,
  );
  // pelotonia 25 + half of fundraising 25, out of 100 active weight.
  assert.equal(readinessScore(items), 38);
});
