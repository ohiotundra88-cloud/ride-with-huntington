import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultAdminState } from "../src/lib/admin-content.ts";
import { matchIntent } from "../src/lib/concierge.ts";

const intents = defaultAdminState("2026-09-28T00:00:00.000Z").concierge.intents;

test("questions match the default answers by keyword, case-insensitively", () => {
  assert.equal(
    matchIntent("Where should my family PARK?", intents)?.title,
    "Family and spectator parking",
  );
  assert.equal(matchIntent("How do I submit expenses?", intents)?.title, "Expenses");
});

test("inactive answers are skipped and unknown questions return null", () => {
  const withoutParking = intents.map((i) =>
    i.keywords.includes("park") ? { ...i, active: false } : i,
  );
  assert.equal(matchIntent("parking?", withoutParking), null);
  assert.equal(matchIntent("what is the meaning of life", intents), null);
});

test("admin order decides between two matching answers", () => {
  const a = { ...intents[0], id: "a", title: "First", keywords: ["tent"], order: 1 };
  const b = { ...intents[0], id: "b", title: "Second", keywords: ["tent"], order: 0 };
  assert.equal(matchIntent("tent", [a, b])?.title, "Second");
});
