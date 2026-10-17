import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canManageRideWeekendDate,
  canLeaveJourneyEditMode,
  discardRideWeekendDateDraft,
  rideWeekendDateDraftDirty,
  rideWeekendDateFromInput,
  rideWeekendDateInput,
  siteSettingsAfterRideWeekendDateSave,
  siteSettingsFromRows,
  syncRideWeekendDateDraft,
  UNAVAILABLE_SITE_SETTINGS,
} from "../src/lib/site-settings.shared.ts";

test("countdown date management is limited to admins and super users", () => {
  assert.equal(canManageRideWeekendDate(["admin"]), true);
  assert.equal(canManageRideWeekendDate(["superuser"]), true);
  assert.equal(canManageRideWeekendDate(["captain"]), false);
  assert.equal(canManageRideWeekendDate([]), false);
});

test("ride weekend date inputs save as midnight in Columbus", () => {
  assert.equal(rideWeekendDateFromInput("2027-08-07"), "2027-08-07T04:00:00.000Z");
  assert.equal(rideWeekendDateFromInput("2027-01-07"), "2027-01-07T05:00:00.000Z");
});

test("stored ride weekend timestamps render as the Columbus calendar date", () => {
  assert.equal(rideWeekendDateInput("2027-08-07T04:00:00.000Z"), "2027-08-07");
});

test("invalid ride weekend dates are rejected", () => {
  assert.throws(() => rideWeekendDateFromInput("2027-02-30"), /valid date/i);
  assert.throws(() => rideWeekendDateFromInput("August 7, 2027"), /valid date/i);
});

test("legacy switch values survive when the countdown column is unavailable", () => {
  assert.deepEqual(
    siteSettingsFromRows({ fundraiser_pages_enabled: false, vendor_crm_enabled: false }, undefined),
    {
      fundraiserPagesEnabled: false,
      vendorCrmEnabled: false,
      rideWeekendDate: "2027-08-07T00:00:00-04:00",
      rideWeekendDateAvailable: false,
    },
  );
});

test("a failed settings read keeps security switches closed", () => {
  assert.equal(UNAVAILABLE_SITE_SETTINGS.fundraiserPagesEnabled, false);
  assert.equal(UNAVAILABLE_SITE_SETTINGS.vendorCrmEnabled, false);
  assert.equal(UNAVAILABLE_SITE_SETTINGS.rideWeekendDateAvailable, false);
});

test("journey edit mode cannot close with an unsaved countdown date", () => {
  assert.equal(canLeaveJourneyEditMode("2027-08-08", "2027-08-07"), false);
  assert.equal(canLeaveJourneyEditMode("2027-08-07", "2027-08-07"), true);
});

test("a pending countdown draft initializes from the live date during text editing", () => {
  assert.deepEqual(
    syncRideWeekendDateDraft(
      { date: "2027-08-07", configuredDate: null, ready: false, touched: false },
      "2028-08-05",
      true,
      true,
    ),
    {
      date: "2028-08-05",
      configuredDate: "2028-08-05",
      ready: true,
      touched: false,
    },
  );
});

test("a failed background read preserves the authoritative dirty-state baseline", () => {
  const dirtyDraft = {
    date: "2027-08-07",
    configuredDate: "2028-08-05",
    ready: true,
    touched: true,
  };
  const afterFailure = syncRideWeekendDateDraft(dirtyDraft, "2027-08-07", false, true);
  assert.deepEqual(afterFailure, dirtyDraft);
  assert.equal(rideWeekendDateDraftDirty(afterFailure), true);
});

test("a successful background read updates the dirty draft baseline and discard target", () => {
  const dirtyDraft = {
    date: "2028-08-06",
    configuredDate: "2028-08-05",
    ready: true,
    touched: true,
  };
  const afterRemoteChange = syncRideWeekendDateDraft(dirtyDraft, "2028-08-07", true, true);

  assert.deepEqual(afterRemoteChange, {
    date: "2028-08-06",
    configuredDate: "2028-08-07",
    ready: true,
    touched: true,
  });
  assert.deepEqual(discardRideWeekendDateDraft(afterRemoteChange), {
    date: "2028-08-07",
    configuredDate: "2028-08-07",
    ready: true,
    touched: false,
  });
});

test("a successful countdown write keeps the authoritative RPC timestamp", () => {
  assert.deepEqual(
    siteSettingsAfterRideWeekendDateSave(
      UNAVAILABLE_SITE_SETTINGS,
      "2028-08-05T04:00:00.000Z",
      "2028-08-05T04:00:00.000Z",
    ),
    {
      fundraiserPagesEnabled: false,
      vendorCrmEnabled: false,
      rideWeekendDate: "2028-08-05T04:00:00.000Z",
      rideWeekendDateAvailable: true,
    },
  );
  assert.throws(
    () =>
      siteSettingsAfterRideWeekendDateSave(
        UNAVAILABLE_SITE_SETTINGS,
        "2028-08-05T05:00:00.000Z",
        "2028-08-05T04:00:00.000Z",
      ),
    /did not match/i,
  );
});

test("the countdown database write enforces admin or super-user authorization", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20261008120000_ride_weekend_countdown_date.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /public\.is_admin_text\(auth\.uid\(\)\)/);
  assert.match(migration, /public\.is_superuser\(auth\.uid\(\)\)/);
  assert.match(migration, /AT TIME ZONE 'America\/New_York'/);
  assert.match(migration, /ADD CONSTRAINT site_settings_ride_weekend_date_columbus_midnight/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.set_ride_weekend_date/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.set_ride_weekend_date/);
});
