import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { useAdmin } from "@/lib/admin-store";
import { readinessScore } from "@/lib/admin-content";
import { mergeReadinessWithRegistration } from "@/lib/journey-merge";
import { getRiderFundraising } from "@/lib/pelotonia.functions";

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
    [state.readiness, registration, riderFundraising],
  );
  const score = useMemo(() => readinessScore(merged), [merged]);

  return { merged, score, riderFundraising: riderFundraising ?? null };
}
