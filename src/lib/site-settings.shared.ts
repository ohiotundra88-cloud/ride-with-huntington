import { RIDE_WEEKEND_DATE } from "./ride-weekend.ts";

const RIDE_TIME_ZONE = "America/New_York";
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface SiteSettings {
  fundraiserPagesEnabled: boolean;
  vendorCrmEnabled: boolean;
  rideWeekendDate: string;
  rideWeekendDateAvailable: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  fundraiserPagesEnabled: true,
  vendorCrmEnabled: true,
  rideWeekendDate: RIDE_WEEKEND_DATE,
  rideWeekendDateAvailable: false,
};

export const UNAVAILABLE_SITE_SETTINGS: SiteSettings = {
  ...DEFAULT_SITE_SETTINGS,
  fundraiserPagesEnabled: false,
  vendorCrmEnabled: false,
};

export function siteSettingsFromRows(
  switches: { fundraiser_pages_enabled: boolean; vendor_crm_enabled: boolean },
  rideWeekendDate: string | null | undefined,
): SiteSettings {
  const hasRideWeekendDate =
    typeof rideWeekendDate === "string" && !Number.isNaN(new Date(rideWeekendDate).getTime());
  return {
    fundraiserPagesEnabled: !!switches.fundraiser_pages_enabled,
    vendorCrmEnabled: !!switches.vendor_crm_enabled,
    rideWeekendDate: hasRideWeekendDate ? rideWeekendDate : RIDE_WEEKEND_DATE,
    rideWeekendDateAvailable: hasRideWeekendDate,
  };
}

export function siteSettingsAfterRideWeekendDateSave(
  settings: SiteSettings,
  savedDate: string,
  requestedDate: string,
): SiteSettings {
  const savedTime = new Date(savedDate).getTime();
  const requestedTime = new Date(requestedDate).getTime();
  if (Number.isNaN(savedTime) || Number.isNaN(requestedTime) || savedTime !== requestedTime) {
    throw new Error("The saved Ride Weekend countdown date did not match the requested date.");
  }
  return {
    ...settings,
    rideWeekendDate: savedDate,
    rideWeekendDateAvailable: true,
  };
}

export interface RideWeekendDateDraft {
  date: string;
  configuredDate: string | null;
  ready: boolean;
  touched: boolean;
}

export function syncRideWeekendDateDraft(
  draft: RideWeekendDateDraft,
  configuredDate: string,
  configuredDateAvailable: boolean,
  editing: boolean,
): RideWeekendDateDraft {
  if (!configuredDateAvailable) return draft;

  if (!editing || !draft.touched) {
    return {
      date: configuredDate,
      configuredDate,
      ready: true,
      touched: false,
    };
  }

  return { ...draft, configuredDate, ready: true };
}

export function rideWeekendDateDraftDirty(draft: RideWeekendDateDraft) {
  return (
    draft.ready &&
    draft.touched &&
    draft.configuredDate !== null &&
    draft.date !== draft.configuredDate
  );
}

export function discardRideWeekendDateDraft(draft: RideWeekendDateDraft) {
  if (!draft.ready || draft.configuredDate === null) return draft;
  return {
    ...draft,
    date: draft.configuredDate,
    touched: false,
  };
}

export function canManageRideWeekendDate(roles: string[]) {
  return roles.includes("admin") || roles.includes("superuser");
}

export function canLeaveJourneyEditMode(draftDate: string, configuredDate: string) {
  return draftDate === configuredDate;
}

function calendarParts(value: string) {
  const match = CALENDAR_DATE.exec(value);
  if (!match) throw new Error("Enter a valid date.");
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error("Enter a valid date.");
  }
  return { year, month, day };
}

function zonedParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RIDE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** Convert a date field value into midnight in Columbus, Ohio. */
export function rideWeekendDateFromInput(value: string) {
  const target = calendarParts(value);
  const desiredWallClock = Date.UTC(target.year, target.month - 1, target.day);
  let timestamp = desiredWallClock;

  // Resolve the America/New_York offset without assuming whether the date is
  // in daylight or standard time.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(timestamp);
    const actualWallClock = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const correction = desiredWallClock - actualWallClock;
    timestamp += correction;
    if (correction === 0) break;
  }

  return new Date(timestamp).toISOString();
}

/** Convert a stored timestamp into the date shown to Columbus-based editors. */
export function rideWeekendDateInput(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Enter a valid date.");
  const parts = zonedParts(timestamp.getTime());
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
