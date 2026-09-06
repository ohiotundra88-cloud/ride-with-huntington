import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useStore, type Registration } from "@/lib/store";
import { useAdmin, readinessScore, type EditableReadinessItem } from "@/lib/admin-store";
import type { ReadinessStatus } from "@/lib/mock-data";
import { getRiderFundraising } from "@/lib/pelotonia.functions";
import { pelotoniaStatus, travelStatus, bikeStatus, apparelStatus } from "@/lib/registration-progress";

/**
 * Presentation-only overlay: derive readiness card status/detail from the
 * participant's actual registration answers. Seeded demo content remains the
 * fallback for any step the participant hasn't answered yet.
 */
export function mergeReadinessWithRegistration(
  items: EditableReadinessItem[],
  reg: Registration,
  fundraising?: { raised: number; committed: number; goal: number } | null
): EditableReadinessItem[] {
  const participation = reg.participation;
  const isRider = participation === "rider" || participation === "both";
  const isVolunteer = participation === "volunteer" || participation === "both";

  return items.map((item) => {
    const over = (status: ReadinessStatus, detail?: string, ctaLabel?: string): EditableReadinessItem => ({
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
          return over("complete", p.confirmation ? `Registered · Rider ID ${p.confirmation}` : "Pelotonia registration confirmed.", "View registration");
        }
        if (st === "pending") return over("in_progress", "Pelotonia registration started — add your Rider ID and HB number.", "Finish registration");
        return over("action_needed", "Register with Pelotonia and add your Rider ID and HB number.", "Start registration");
      }
      case "hotel": {
        const t = reg.travel;
        if (t.needs === "none") return over("not_applicable", "No travel or hotel needed.", "Update travel");
        const st = travelStatus(reg);
        if (st === "complete") {
          const detail = t.hotelName
            ? `${t.hotelName}${t.hotelCheckIn ? ` · ${t.hotelCheckIn} – ${t.hotelCheckOut}` : ""}`
            : "Travel and hotel details confirmed.";
          return over("reserved", detail, "View travel");
        }
        if (st === "pending") return over("in_progress", "Travel details started — confirm your dates.", "Finish travel");
        return over("action_needed", "Add your travel and hotel plans before Jul 22.", "Add travel");
      }
      case "bike": {
        const b = reg.bike;
        if (participation && !isRider) return over("not_applicable", "You're registered as a Volunteer — no bike needed.", "View bike step");
        if (b.needs === "no") return over("complete", "Bringing your own bike — no rental needed.", "Update bike plan");
        if (b.needs === "yes") {
          if (bikeStatus(reg) === "complete") {
            const specs = [b.bikeType, b.bikeSize && `Size ${b.bikeSize}`, b.pedals].filter(Boolean).join(" · ");
            return over("reserved", specs ? `Rental requested · ${specs}` : "Rental requested.", "View bike details");
          }
          return over("action_needed", "Finish your rental details — size, type, pedals and dates.", "Finish bike rental");
        }
        if (b.needs === "unsure") return over("in_progress", "Still deciding — confirm your bike plan before Jul 22.", "Decide bike plan");
        return over("action_needed", "Tell us whether you need a bike rental.", "Choose bike plan");
      }
      case "volunteer": {
        if (!participation) return over("action_needed", "Choose how you're taking part to see your next steps.", item.ctaLabel);
        if (!isVolunteer) return over("not_applicable", "You're registered as a Rider — no shift needed.", item.ctaLabel);
        return over("in_progress", "Volunteer shift assignments open closer to Ride Weekend.", "Volunteer info");
      }
      case "apparel": {
        const a = reg.apparel;
        const st = apparelStatus(reg);
        if (st === "complete") {
          const bits = [a.jerseyStyle && a.jerseyStyle.replace("-", " "), a.jerseySize && `jersey (${a.jerseySize})`].filter(Boolean).join(" ");
          return over("ordered", bits ? `${bits.charAt(0).toUpperCase() + bits.slice(1)} · confirmed` : "Apparel selections confirmed.", "View apparel");
        }
        if (st === "pending") return over("in_progress", "Apparel started — confirm sizes and mailing address.", "Finish apparel");
        return over("action_needed", "Choose your sizes and confirm your mailing address.", "Choose apparel");
      }

      case "fundraising": {
        // Score against the live Pelotonia commitment, not seeded demo values.
        if (participation && !isRider) return over("not_applicable", "You're registered as a Volunteer — no fundraising commitment.", item.ctaLabel);
        if (!fundraising) {
          // No live fundraising total yet — don't let seeded demo numbers drag
          // the readiness percentage down.
          return { ...item, weight: 0 };
        }
        const target = fundraising.committed || fundraising.goal;
        const next: EditableReadinessItem = {
          ...item,
          progressCurrent: fundraising.raised,
          progressGoal: target || item.progressGoal,
        };
        if (target > 0 && fundraising.raised >= target) {
          return { ...next, status: "complete", detail: "Commitment met — thank you!" };
        }
        return { ...next, status: "in_progress" };
      }

      default:
        return item;
    }
  });
}

/**
 * Single source of truth for "how ready am I": the same merged readiness items
 * and score the dashboard ring shows, so any other screen (the home welcome
 * card) can display the identical percentage instead of its own tally.
 */
export function useJourneyReadiness() {
  const { registration } = useStore();
  const { state } = useAdmin();

  const riderId = (registration.pelotonia.confirmation ?? "").trim();
  const fetchRider = useServerFn(getRiderFundraising);
  const { data: riderFundraising } = useQuery({
    queryKey: ["rider-fundraising", riderId],
    queryFn: () => fetchRider({ data: { publicId: riderId } }),
    enabled: riderId.length > 0,
    staleTime: 5 * 60_000,
  });

  const merged = useMemo(
    () => mergeReadinessWithRegistration(state.readiness, registration, riderFundraising ?? null),
    [state.readiness, registration, riderFundraising]
  );
  const score = useMemo(() => readinessScore(merged), [merged]);

  return { merged, score, riderFundraising: riderFundraising ?? null };
}
