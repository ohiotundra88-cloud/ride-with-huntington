// Pure overlays that turn the shared readiness and timeline content into one
// colleague's view, based on their own registration answers.

import type { Registration } from "@/lib/store";
import type {
  EditableReadinessItem,
  EditableTimelineItem,
  ReadinessStatus,
} from "./admin-content.ts";
import {
  pelotoniaStatus,
  travelStatus,
  bikeStatus,
  apparelStatus,
  isRiderParticipation,
  isVolunteerParticipation,
  isFundraisingParticipation,
  isChallengerParticipation,
} from "./registration-progress.ts";

export interface RiderFundraising {
  raised: number;
  committed: number;
  goal: number;
}

/** "2027-07-22" -> "Jul 22". Null when unset or not a valid YYYY-MM-DD date. */
export function formatDeadline(deadline: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((deadline ?? "").trim());
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(m[3])) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Appends " by <deadline>" to a sentence when the admin has set a deadline. */
function withDeadline(sentence: string, deadline: string | undefined): string {
  const when = formatDeadline(deadline);
  return when ? `${sentence} by ${when}.` : `${sentence}.`;
}

/**
 * Presentation-only overlay: derive readiness card status and detail from the
 * participant's actual registration answers. The shared step definitions are
 * the fallback for any step that has no answer-based override.
 */
export function mergeReadinessWithRegistration(
  items: EditableReadinessItem[],
  reg: Registration,
  fundraising?: RiderFundraising | null,
): EditableReadinessItem[] {
  const participation = reg.participation;
  const isRider = isRiderParticipation(participation);
  const isVolunteer = isVolunteerParticipation(participation);
  const fundraises = isFundraisingParticipation(participation);
  const isChallenger = isChallengerParticipation(participation);
  const roleLabel = isChallenger ? "a Challenger" : "a Volunteer";

  return items.map((item) => {
    const over = (
      status: ReadinessStatus,
      detail?: string,
      ctaLabel?: string,
    ): EditableReadinessItem => ({
      ...item,
      status,
      detail: detail ?? item.detail,
      ctaLabel: ctaLabel ?? item.ctaLabel,
    });

    switch (item.id) {
      case "pelotonia": {
        const p = reg.pelotonia;
        const st = pelotoniaStatus(reg);
        if (st === "complete") {
          return over(
            "complete",
            p.confirmation
              ? `Registered · Rider ID ${p.confirmation}`
              : "Pelotonia registration confirmed.",
            "View registration",
          );
        }
        if (st === "pending")
          return over(
            "in_progress",
            "Pelotonia registration started — add your Rider ID and HB number.",
            "Finish registration",
          );
        return over(
          "action_needed",
          "Register with Pelotonia and add your Rider ID and HB number.",
          "Start registration",
        );
      }
      case "hotel": {
        const t = reg.travel;
        if (isChallenger)
          return over(
            "not_applicable",
            "You're registered as a Challenger, so no travel or hotel is needed.",
            "View travel",
          );
        if (t.needs === "none")
          return over("not_applicable", "No travel or hotel needed.", "Update travel");
        const st = travelStatus(reg);
        if (st === "complete") {
          const detail = t.hotelName
            ? `${t.hotelName}${t.hotelCheckIn ? ` · ${t.hotelCheckIn} – ${t.hotelCheckOut}` : ""}`
            : "Travel and hotel details confirmed.";
          return over("reserved", detail, "View travel");
        }
        if (st === "pending")
          return over(
            "in_progress",
            "Travel details started — confirm your dates.",
            "Finish travel",
          );
        return over(
          "action_needed",
          withDeadline("Add your travel and hotel plans", item.deadline),
          "Add travel",
        );
      }
      case "bike": {
        const b = reg.bike;
        if (participation && !isRider)
          return over(
            "not_applicable",
            `You're registered as ${roleLabel}, so no bike is needed.`,
            "View bike step",
          );
        if (b.needs === "no")
          return over("complete", "Bringing your own bike — no rental needed.", "Update bike plan");
        if (b.needs === "yes") {
          if (bikeStatus(reg) === "complete") {
            const specs = [b.bikeType, b.bikeSize && `Size ${b.bikeSize}`, b.pedals]
              .filter(Boolean)
              .join(" · ");
            return over(
              "reserved",
              specs ? `Rental requested · ${specs}` : "Rental requested.",
              "View bike details",
            );
          }
          return over(
            "action_needed",
            "Finish your rental details — size, type, pedals and dates.",
            "Finish bike rental",
          );
        }
        if (b.needs === "unsure")
          return over(
            "in_progress",
            withDeadline("Still deciding? Confirm your bike plan", item.deadline),
            "Decide bike plan",
          );
        return over("action_needed", "Tell us whether you need a bike rental.", "Choose bike plan");
      }
      case "volunteer": {
        if (!participation)
          return over(
            "action_needed",
            "Choose how you're taking part to see your next steps.",
            item.ctaLabel,
          );
        if (!isVolunteer)
          return over(
            "not_applicable",
            "You're registered as a Rider — no shift needed.",
            item.ctaLabel,
          );
        return over(
          "in_progress",
          "Volunteer shift assignments open closer to Ride Weekend.",
          "Volunteer info",
        );
      }
      case "apparel": {
        const a = reg.apparel;
        if (isChallenger)
          return over(
            "not_applicable",
            "You're registered as a Challenger, so there's no apparel to order.",
            "View apparel",
          );
        const st = apparelStatus(reg);
        if (st === "complete") {
          const bits = [
            a.jerseyStyle && a.jerseyStyle.replace("-", " "),
            a.jerseySize && `jersey (${a.jerseySize})`,
          ]
            .filter(Boolean)
            .join(" ");
          return over(
            "ordered",
            bits
              ? `${bits.charAt(0).toUpperCase() + bits.slice(1)} · confirmed`
              : "Apparel selections confirmed.",
            "View apparel",
          );
        }
        if (st === "pending")
          return over(
            "in_progress",
            "Apparel started — confirm sizes and mailing address.",
            "Finish apparel",
          );
        return over(
          "action_needed",
          withDeadline("Choose your sizes and confirm your mailing address", item.deadline),
          "Choose apparel",
        );
      }

      case "fundraising": {
        // Score against the live Pelotonia commitment only.
        if (participation && !fundraises)
          return over(
            "not_applicable",
            "You're registered as a Volunteer — no fundraising commitment.",
            item.ctaLabel,
          );
        if (!fundraising) {
          // No live fundraising total yet: show no progress and leave the step
          // out of the readiness percentage rather than guess.
          return {
            ...item,
            weight: 0,
            progressCurrent: undefined,
            progressGoal: undefined,
            detail: reg.pelotonia.confirmation.trim()
              ? "Your fundraising total isn't available yet."
              : "Add your Pelotonia Rider ID to see your fundraising progress.",
          };
        }
        const target = fundraising.committed || fundraising.goal;
        const next: EditableReadinessItem = {
          ...item,
          progressCurrent: fundraising.raised,
          progressGoal: target || undefined,
        };
        if (target > 0 && fundraising.raised >= target) {
          return { ...next, status: "complete", detail: "Commitment met, thank you!" };
        }
        return { ...next, status: "in_progress" };
      }

      default:
        return item;
    }
  });
}

/**
 * Presentation-only overlay: reflect the participant's registration answers on
 * timeline steps so they aren't told to do things they opted out of, and a
 * step only shows as done when their answers say so.
 */
export function mergeTimelineWithRegistration(
  items: EditableTimelineItem[],
  reg: Registration,
): EditableTimelineItem[] {
  const isRider = isRiderParticipation(reg.participation);
  const bikeTitle = /bike/i;
  const pelDone = pelotoniaStatus(reg) === "complete";
  return items.map((item) => {
    if (/pelotonia registration/i.test(item.title)) {
      if (!pelDone) {
        return {
          ...item,
          state: "current",
          time: "Action needed",
          instructions:
            "Register with Pelotonia, then add your Rider ID and HB number to your profile.",
        };
      }
      const riderId = reg.pelotonia.confirmation.trim();
      return {
        ...item,
        state: "completed",
        time: "Completed",
        instructions: riderId
          ? `You're registered with Rider ID ${riderId}.`
          : "Your Pelotonia registration is confirmed.",
      };
    }
    if (!bikeTitle.test(item.title)) return item;

    if (reg.participation && !isRider) {
      return {
        ...item,
        state: "completed",
        time: "Not applicable",
        instructions: "You're registered as a Volunteer — no bike needed.",
        note: undefined,
        location: undefined,
      };
    }
    if (reg.bike.needs === "no") {
      return {
        ...item,
        title: "Bring your own bike",
        state: "completed",
        time: "Confirmed",
        instructions: "You're using your own bike, so there's no rental to reserve.",
        note: undefined,
        location: undefined,
        ctaLabel: "Update bike plan",
      };
    }
    return item;
  });
}
