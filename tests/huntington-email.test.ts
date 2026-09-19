import { test } from "node:test";
import assert from "node:assert/strict";
import { isHuntingtonEmail, requireConfirmedHuntingtonUser } from "../src/lib/huntington-email.ts";

for (const email of ["colleague@huntington.com", "COLLEAGUE@HUNTINGTON.COM", " colleague@huntington.com ", "colleague+ride@huntington.com"]) {
  test(`accepts ${email}`, () => assert.equal(isHuntingtonEmail(email), true));
}
for (const email of [null, undefined, "", "@huntington.com", "a@gmail.com", "a@huntington.com.evil.test", "a@sub.huntington.com", "a@@huntington.com", "a b@huntington.com", "a@huntingtonXcom", "a@huntington.com\nevil"]) {
  test(`rejects ${String(email)}`, () => assert.equal(isHuntingtonEmail(email), false));
}
test("unconfirmed accounts cannot activate or save passwords", () => {
  assert.throws(() => requireConfirmedHuntingtonUser({ email: "a@huntington.com" }), /Verify the code/);
  assert.throws(() => requireConfirmedHuntingtonUser({ email: "a@huntington.com", email_confirmed_at: null }), /Verify the code/);
});
test("confirmed outside addresses cannot activate", () => {
  assert.throws(() => requireConfirmedHuntingtonUser({ email: "a@gmail.com", email_confirmed_at: "2026-09-19" }), /Only @huntington/);
});
test("confirmed Huntington accounts can continue", () => {
  assert.equal(requireConfirmedHuntingtonUser({ email: "A@HUNTINGTON.COM", email_confirmed_at: "2026-09-19" }), "a@huntington.com");
});
