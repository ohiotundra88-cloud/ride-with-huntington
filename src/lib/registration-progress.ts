import type { Registration, StepStatus } from "@/lib/store";

/**
 * Effective step statuses derived from the participant's actual answers.
 *
 * A stored `status` value can be stale (an older cached copy, an imported row,
 * or a partially saved form), so it can never outrank missing data: a step only
 * reads "complete" when the fields that define it are actually filled in.
 */

const filled = (v?: string | null) => typeof v === "string" && v.trim() !== "";

export function isRiderParticipation(p: Registration["participation"]): boolean {
  return p === "rider" || p === "both";
}

export function pelotoniaHasData(reg: Registration): boolean {
  const p = reg.pelotonia;
  return filled(p.confirmation) || filled(p.hbNumber) || filled(p.employmentType) || p.completed;
}

export function pelotoniaStatus(reg: Registration): StepStatus {
  const p = reg.pelotonia;
  const complete = filled(p.confirmation) || filled(p.hbNumber);
  if (p.status === "complete" && complete) return "complete";
  if (pelotoniaHasData(reg)) return "pending";
  return "not_started";
}

export function travelHasData(reg: Registration): boolean {
  const t = reg.travel;
  return (
    filled(t.needs) || filled(t.arrivalDate) || filled(t.departureDate) || filled(t.hotelName) ||
    filled(t.hotelCheckIn) || filled(t.hotelCheckOut) || filled(t.departureCity) || t.bookLater
  );
}

export function travelStatus(reg: Registration): StepStatus {
  const t = reg.travel;
  if (t.needs === "none") return "complete";
  const complete = t.bookLater || filled(t.arrivalDate) || filled(t.hotelName) || filled(t.hotelCheckIn);
  if (t.status === "complete" && complete) return "complete";
  if (travelHasData(reg)) return "pending";
  return "not_started";
}

export function bikeStatus(reg: Registration): StepStatus {
  const b = reg.bike;
  if (!isRiderParticipation(reg.participation)) return "complete";
  if (b.needs === "no") return "complete";
  if (b.needs === "yes") {
    const complete = filled(b.bikeType) && filled(b.bikeSize);
    if (b.status === "complete" && complete) return "complete";
    return "pending";
  }
  return "not_started";
}

export function apparelHasData(reg: Registration): boolean {
  const a = reg.apparel;
  return (
    filled(a.jerseySize) || filled(a.jerseyStyle) || filled(a.shirtSize) ||
    filled(a.cut) || filled(a.volunteerShirtSize) || filled(a.volunteerCut)
  );
}

export function apparelStatus(reg: Registration): StepStatus {
  const a = reg.apparel;
  const isRider = isRiderParticipation(reg.participation);
  const complete = isRider
    ? filled(a.jerseySize) || filled(a.shirtSize)
    : filled(a.volunteerShirtSize) || filled(a.shirtSize);
  if (a.status === "complete" && complete) return "complete";
  if (apparelHasData(reg)) return "pending";
  return "not_started";
}

export function effectiveStatuses(reg: Registration) {
  return {
    pelotonia: pelotoniaStatus(reg),
    travel: travelStatus(reg),
    bike: bikeStatus(reg),
    apparel: apparelStatus(reg),
  };
}
