import type { TimelinePhase } from "./admin-content.ts";

/**
 * Pelotonia Ride Weekend 2027 is Saturday Aug 7 and Sunday Aug 8, 2027, with
 * the Opening Ceremony on Friday Aug 6 (pelotonia.org/get-involved/ride-weekend,
 * checked 2026-09-28). Route start times aren't published yet, so the
 * dashboard countdown runs to the start of Ride Day in Columbus.
 *
 * Update this each season.
 */
export const RIDE_WEEKEND_DATE = "2027-08-07T00:00:00-04:00";

export const timelineSections: { phase: TimelinePhase; label: string }[] = [
  { phase: "today", label: "Today" },
  { phase: "next_week", label: "Next week" },
  { phase: "two_weeks", label: "Two weeks before" },
  { phase: "ride_week", label: "Ride week" },
  { phase: "friday", label: "Friday · Aug 6" },
  { phase: "saturday", label: "Saturday · Aug 7 (Ride Day)" },
  { phase: "sunday", label: "Sunday · Aug 8" },
];
