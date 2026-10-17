// Aggregate figures for the admin analytics page, computed from the real
// registrations returned by listColleagues(). Pure, so it is unit tested.

import type { Participation, Registration, StepStatus } from "@/lib/store";
import {
  effectiveStatuses,
  isRiderParticipation,
  isVolunteerParticipation,
  needsTravelAndApparel,
  registrationCompletion,
} from "./registration-progress.ts";

type JsonObject = Record<string, string | number | boolean | null>;

/** The fields of a ColleagueRecord this module reads. */
export interface RegistrationRecord {
  participation: string | null;
  region: string | null;
  reg_id: string | null;
  submitted_at: string | null;
  pelotonia: JsonObject;
  travel: JsonObject;
  bike: JsonObject;
  apparel: JsonObject;
  address: JsonObject;
}

export type RoleFilter = "all" | "riders" | "volunteers";

export interface StepCounts {
  applicable: number;
  complete: number;
  pending: number;
  notStarted: number;
}

export interface RegistrationSummary {
  total: number;
  submitted: number;
  roles: {
    rider: number;
    volunteer: number;
    challenger: number;
    unsure: number;
    notChosen: number;
  };
  steps: { pelotonia: StepCounts; travel: StepCounts; bike: StepCounts; apparel: StepCounts };
  hotelRequests: number;
  bikeRentals: number;
  /** Mean of each person's completion percentage, rounded. 0 when empty. */
  averageCompletion: number;
  completionBands: { label: string; count: number }[];
  regions: { region: string; people: number; averageCompletion: number }[];
}

const PARTICIPATIONS: ReadonlySet<string> = new Set([
  "rider",
  "volunteer",
  "challenger",
  "both",
  "unsure",
]);

function participationOf(value: string | null): Participation {
  return value && PARTICIPATIONS.has(value) ? (value as Participation) : null;
}

/**
 * Rebuild the answers a registration row holds. The step status functions
 * treat any field missing from the stored JSON as empty, so the stored
 * objects are passed through as they are.
 */
export function toRegistration(r: RegistrationRecord): Registration {
  return {
    id: r.reg_id,
    participation: participationOf(r.participation),
    pelotonia: r.pelotonia as unknown as Registration["pelotonia"],
    travel: r.travel as unknown as Registration["travel"],
    bike: r.bike as unknown as Registration["bike"],
    apparel: r.apparel as unknown as Registration["apparel"],
    address: r.address as unknown as Registration["address"],
    submittedAt: r.submitted_at,
    audit: [],
  };
}

export function matchesRole(r: RegistrationRecord, filter: RoleFilter): boolean {
  const p = participationOf(r.participation);
  if (filter === "riders") return isRiderParticipation(p);
  if (filter === "volunteers") return isVolunteerParticipation(p);
  return true;
}

const emptyCounts = (): StepCounts => ({ applicable: 0, complete: 0, pending: 0, notStarted: 0 });

function tally(counts: StepCounts, status: StepStatus) {
  counts.applicable++;
  if (status === "complete") counts.complete++;
  else if (status === "pending") counts.pending++;
  else counts.notStarted++;
}

const BANDS = [
  { label: "Fully ready (100%)", min: 100 },
  { label: "On track (70 to 99%)", min: 70 },
  { label: "Needs attention (40 to 69%)", min: 40 },
  { label: "Just started (under 40%)", min: 0 },
] as const;

export function summarizeRegistrations(records: RegistrationRecord[]): RegistrationSummary {
  const roles = { rider: 0, volunteer: 0, challenger: 0, unsure: 0, notChosen: 0 };
  const steps = {
    pelotonia: emptyCounts(),
    travel: emptyCounts(),
    bike: emptyCounts(),
    apparel: emptyCounts(),
  };
  const bands = BANDS.map((b) => ({ label: b.label, count: 0 }));
  const regions = new Map<string, { people: number; completionSum: number }>();
  let submitted = 0;
  let hotelRequests = 0;
  let bikeRentals = 0;
  let completionSum = 0;

  for (const record of records) {
    const reg = toRegistration(record);
    const p = reg.participation;
    if (p === "both") {
      roles.rider++;
      roles.volunteer++;
    } else if (p) roles[p]++;
    else roles.notChosen++;

    if (record.submitted_at) submitted++;

    const status = effectiveStatuses(reg);
    tally(steps.pelotonia, status.pelotonia);
    if (needsTravelAndApparel(p)) {
      tally(steps.travel, status.travel);
      tally(steps.apparel, status.apparel);
    }
    if (isRiderParticipation(p)) tally(steps.bike, status.bike);

    const needs = reg.travel.needs;
    if (needsTravelAndApparel(p) && (needs === "hotel" || needs === "both")) hotelRequests++;
    if (isRiderParticipation(p) && reg.bike.needs === "yes") bikeRentals++;

    const completion = registrationCompletion(reg);
    completionSum += completion;
    bands[BANDS.findIndex((b) => completion >= b.min)].count++;

    const region = record.region?.trim() || "No region on profile";
    const entry = regions.get(region) ?? { people: 0, completionSum: 0 };
    entry.people++;
    entry.completionSum += completion;
    regions.set(region, entry);
  }

  return {
    total: records.length,
    submitted,
    roles,
    steps,
    hotelRequests,
    bikeRentals,
    averageCompletion: records.length ? Math.round(completionSum / records.length) : 0,
    completionBands: bands,
    regions: [...regions.entries()]
      .map(([region, e]) => ({
        region,
        people: e.people,
        averageCompletion: Math.round(e.completionSum / e.people),
      }))
      .sort((a, b) => b.people - a.people || a.region.localeCompare(b.region)),
  };
}

/** Plain-language follow-ups for steps people haven't finished. */
export function outstandingActions(summary: RegistrationSummary): string[] {
  const open = (c: StepCounts) => c.applicable - c.complete;
  const items: [number, string][] = [
    [summary.roles.notChosen, "chosen how they're taking part"],
    [open(summary.steps.pelotonia), "confirmed their Pelotonia registration"],
    [open(summary.steps.travel), "finished travel and hotel"],
    [open(summary.steps.bike), "finished their bike plan"],
    [open(summary.steps.apparel), "finished apparel"],
  ];
  return items
    .filter(([n]) => n > 0)
    .map(([n, text]) => (n === 1 ? `1 person hasn't ${text}` : `${n} people haven't ${text}`));
}
