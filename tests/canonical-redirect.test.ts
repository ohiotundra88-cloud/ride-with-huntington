import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalRedirect } from "../src/server/canonical.ts";

const www = "https://www.ridewithhuntington.com";

test("called the way Nitro calls it (request only): reads PUBLIC_ORIGIN from the Worker vars", () => {
  (globalThis as { __env__?: unknown }).__env__ = { PUBLIC_ORIGIN: www };
  try {
    const apex = canonicalRedirect(new Request("https://ridewithhuntington.com/dashboard?x=1"));
    assert.equal(apex?.status, 301);
    assert.equal(apex?.headers.get("location"), `${www}/dashboard?x=1`);
    const preview = canonicalRedirect(
      new Request("https://ridewithhuntington.madebyotten.com/auth/login", { method: "POST" }),
    );
    assert.equal(preview?.status, 308);
    assert.equal(preview?.headers.get("location"), `${www}/auth/login`);
    assert.equal(canonicalRedirect(new Request(`${www}/`)), null);
    assert.equal(canonicalRedirect(new Request("http://localhost:3000/")), null);
  } finally {
    delete (globalThis as { __env__?: unknown }).__env__;
  }
});

test("an explicit env still wins, and no PUBLIC_ORIGIN means no redirect", () => {
  const r = canonicalRedirect(new Request("https://ridewithhuntington.com/"), {
    PUBLIC_ORIGIN: www,
  });
  assert.equal(r?.headers.get("location"), `${www}/`);
  const saved = process.env.PUBLIC_ORIGIN;
  delete process.env.PUBLIC_ORIGIN;
  assert.equal(canonicalRedirect(new Request("https://ridewithhuntington.com/")), null);
  if (saved !== undefined) process.env.PUBLIC_ORIGIN = saved;
});
