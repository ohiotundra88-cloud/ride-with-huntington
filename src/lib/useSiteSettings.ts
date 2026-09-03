import { useQuery } from "@tanstack/react-query";
import { getSiteSettings, DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings.functions";

export const SITE_SETTINGS_KEY = ["site-settings"] as const;

/** Site-wide switches (fundraiser pages on/off). Falls back to "on" while loading. */
export function useSiteSettings() {
  const q = useQuery<SiteSettings>({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: () => getSiteSettings(),
    staleTime: 30_000,
    retry: false,
  });
  return {
    ...q,
    settings: q.data ?? DEFAULT_SITE_SETTINGS,
    fundraiserPagesEnabled: (q.data ?? DEFAULT_SITE_SETTINGS).fundraiserPagesEnabled,
    /** True only once we know the switch is off. */
    fundraiserPagesPaused: q.data ? !q.data.fundraiserPagesEnabled : false,
  };
}
