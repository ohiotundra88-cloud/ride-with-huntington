import { test } from "node:test";
import assert from "node:assert/strict";
import { exactEmail, containsPattern } from "../src/lib/email-match.ts";
import { safeFileHeaders, typeFromPath } from "../src/lib/safe-file.server.ts";

// Exact email matching -------------------------------------------------------
test("underscore and percent can't act as wildcards", () => {
  assert.equal(exactEmail("a_b@huntington.com"), "a\\_b@huntington.com");
  assert.equal(exactEmail("100%@huntington.com"), "100\\%@huntington.com");
  assert.equal(exactEmail(" Chris.K@Huntington.com "), "chris.k@huntington.com");
});
test("search text is escaped inside a contains pattern", () => {
  assert.equal(containsPattern("x_y"), "%x\\_y%");
});

// Uploaded file headers -------------------------------------------------------
for (const t of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/html; charset=utf-8", "", null]) {
  test(`never renders ${String(t) || "empty"} inline`, () => {
    const h = safeFileHeaders({ contentType: t, fileName: "x" });
    assert.equal(h["Content-Type"], "application/octet-stream");
    assert.match(h["Content-Disposition"], /^attachment;/);
    assert.equal(h["X-Content-Type-Options"], "nosniff");
    assert.match(h["Content-Security-Policy"], /sandbox/);
  });
}
for (const t of ["image/png", "image/jpeg", "image/webp", "application/pdf", "IMAGE/PNG"]) {
  test(`shows ${t} inline`, () => {
    const h = safeFileHeaders({ contentType: t });
    assert.equal(h["Content-Type"], t.toLowerCase());
    assert.match(h["Content-Disposition"], /^inline;/);
  });
}
test("file names can't break out of the header", () => {
  const h = safeFileHeaders({ contentType: "image/png", fileName: 'a"\r\nSet-Cookie: x=1.png' });
  assert.equal(h["Content-Disposition"], 'inline; filename="aSet-Cookie: x=1.png"');
});
test("type from path only knows safe extensions", () => {
  assert.equal(typeFromPath("u/avatar.PNG"), "image/png");
  assert.equal(typeFromPath("u/flier.pdf"), "application/pdf");
  assert.equal(typeFromPath("u/page.html"), null);
  assert.equal(typeFromPath(null), null);
});

// Pelotonia connector (fetch is stubbed; never calls the real service) --------
const RIDER = {
  publicId: "CK0132",
  firstName: "Test",
  lastName: "Rider",
  participantTypes: { isRider: true, isVolunteer: false, isChallenger: false, registeredRides: [{ rideType: "signature" }, { rideType: "gravel" }] },
  tags: [{ name: "10 years" }, { name: "Living Proof" }, { name: "High Roller" }],
  peloton: { id: "p1", name: "Team Huntington Bank - Consumer Regional Bank", isCaptain: false },
  fundraising: { raised: 8365.01, goal: 10000, committedAmount: 5000, committedHighRoller: true, allTimeRaised: 36222.38 },
};

test("rider profile maps to the Hub's fields", async () => {
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    calls.push(String(url));
    const body = String(url).endsWith("/routes") ? [{ name: "Saturday 46 Miles" }] : RIDER;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  try {
    const { fetchRider } = await import("../src/lib/pelotonia-api.server.ts");
    const r = await fetchRider(" ck0132 ");
    assert.ok(r);
    assert.equal(r.publicId, "CK0132");
    assert.equal(r.subTeam, "Consumer Regional Bank");
    assert.equal(r.isSurvivor, true);
    assert.equal(r.isHighRoller, true);
    assert.deepEqual(r.rideTypes, ["signature", "gravel"]);
    assert.deepEqual(r.routes, ["Saturday 46 Miles"]);
    assert.equal(r.committed, 5000);
    const before = calls.length;
    await fetchRider("CK0132");
    assert.equal(calls.length, before, "second lookup is served from cache");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("bad rider IDs never reach Pelotonia", async () => {
  const realFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch;
  try {
    const { fetchRider, normalizePublicId } = await import("../src/lib/pelotonia-api.server.ts");
    assert.equal(normalizePublicId("../admin"), null);
    assert.equal(normalizePublicId(""), null);
    assert.equal(await fetchRider("x/../../y"), null);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a Pelotonia outage returns null instead of throwing", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  try {
    const { fetchTeam } = await import("../src/lib/pelotonia-api.server.ts");
    assert.equal(await fetchTeam(), null);
  } finally {
    globalThis.fetch = realFetch;
  }
});
