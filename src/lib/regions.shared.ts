/** Huntington regions used for colleague profiles, reporting and messaging. */
export const REGIONS = [
  "North and South Carolina",
  "Central Ohio",
  "Northeast Ohio",
  "Colorado",
  "Illinois Wisconsin",
  "Indiana",
  "Minnesota",
  "SE Michigan NW Ohio",
  "Southern Ohio Kentucky",
  "Greater Michigan",
  "West Virginia",
  "TriState",
  "North Texas",
  "Houston Texas",
  "East & Central Texas",
  "Mid South",
  "Alabama",
  "Florida",
  "Atlanta",
  "Greater Georgia",
  "Mississippi",
  "Remote",
] as const;

export type Region = (typeof REGIONS)[number];
