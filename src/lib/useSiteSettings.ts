import { useQuery } from "@tanstack/react-query";
import {
  getSiteSettings,
  DEFAULT_SITE_SETTINGS,
  UNAVAILABLE_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings.functions";

export const SITE_SETTINGS_KEY = ["site-settings"] as const;

/** Site-wide switches (fundraiser pages on/off). Falls back to "on" while loading. */
export function useSiteSettings() {
  const q = useQuery<SiteSettings>({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: () => getSiteSettings(),
    staleTime: 30_000,
    retry: false,
  });
  const settings = q.isError ? UNAVAILABLE_SITE_SETTINGS : (q.data ?? DEFAULT_SITE_SETTINGS);
  return {
    ...q,
    settings,
    fundraiserPagesEnabled: settings.fundraiserPagesEnabled,
    rideWeekendDate: settings.rideWeekendDate,
    rideWeekendDateAvailable: settings.rideWeekendDateAvailable,
    /** True only once we know the switch is off. */
    fundraiserPagesPaused: q.isError || (q.data ? !q.data.fundraiserPagesEnabled : false),
  };
}
