import { test } from "node:test";
import assert from "node:assert/strict";
import { recoverSignIn, refusalReason } from "../src/server/sign-in-recovery.ts";

const callback = (cookie = "") =>
  new Request("https://www.ridewithhuntington.com/auth/callback?code=x&state=y", {
    headers: cookie ? { cookie } : {},
  });
const refusal = (body: string) =>
  new Response(body, {
    status: 400,
    headers: { "set-cookie": "hub_session_tx=; Path=/; Max-Age=0" },
  });

test("reads the reason code from a portal-auth refusal", () => {
  assert.equal(refusalReason("400 login-expired: start again\n"), "login-expired");
  assert.equal(refusalReason("400 state-mismatch\n"), "state-mismatch");
  assert.equal(refusalReason("garbage"), "unknown");
});

test("an expired or mismatched sign-in restarts once, keeping the tx clear", async () => {
  for (const body of ["400 login-expired: start again\n", "400 state-mismatch\n"]) {
    const r = await recoverSignIn(callback(), refusal(body));
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "/auth/login");
    const cookies = r.headers.getSetCookie();
    assert.ok(cookies.some((c) => c.startsWith("hub_session_tx=")));
    assert.ok(cookies.some((c) => c.startsWith("hub_signin_retry=1") && c.includes("Max-Age=120")));
  }
});

test("a second failure shows a readable page instead of looping", async () => {
  const r = await recoverSignIn(
    callback("hub_signin_retry=1"),
    refusal("400 login-expired: start again\n"),
  );
  assert.equal(r.status, 400);
  assert.match(r.headers.get("content-type") ?? "", /text\/html/);
  const html = await r.text();
  assert.match(html, /Sign-in did not finish/);
  assert.match(html, /login-expired/);
  assert.ok(r.headers.getSetCookie().some((c) => c.startsWith("hub_signin_retry=;")));
});

test("a refusal a retry cannot fix (access denied) goes straight to the page", async () => {
  const r = await recoverSignIn(callback(), new Response("403 access_denied\n", { status: 403 }));
  assert.equal(r.status, 403);
  assert.match(await r.text(), /access_denied/);
});

test("success passes through, and clears the retry marker when present", async () => {
  const ok = () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://www.ridewithhuntington.com/", "set-cookie": "hub_session=s" },
    });
  const plain = await recoverSignIn(callback(), ok());
  assert.deepEqual(plain.headers.getSetCookie(), ["hub_session=s"]);
  const after = await recoverSignIn(callback("hub_signin_retry=1"), ok());
  assert.equal(after.status, 302);
  assert.deepEqual(after.headers.getSetCookie().length, 2);
  assert.ok(after.headers.getSetCookie().some((c) => c.startsWith("hub_signin_retry=;")));
});
