import { createDbClient } from "@/server/backend.server";
import {
  siteSettingsFromRows,
  UNAVAILABLE_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings.shared";

/** Anonymous client — the settings row is world-readable by design. */
function publicClient() {
  return createDbClient("anon");
}

export async function readSiteSettings(): Promise<SiteSettings> {
  try {
    const client = publicClient();
    const { data: switches, error: switchesError } = await client
      .from("site_settings")
      .select("fundraiser_pages_enabled, vendor_crm_enabled")
      .eq("id", 1)
      .maybeSingle();
    if (switchesError || !switches) return UNAVAILABLE_SITE_SETTINGS;

    // Read the countdown separately so an app deploy before the migration does
    // not discard existing security-switch values.
    const { data: countdown, error: countdownError } = await client
      .from("site_settings")
      .select("ride_weekend_date")
      .eq("id", 1)
      .maybeSingle();

    return siteSettingsFromRows(
      switches,
      countdownError ? undefined : countdown?.ride_weekend_date,
    );
  } catch {
    return UNAVAILABLE_SITE_SETTINGS;
  }
}

/** Throws when the fundraiser pages are switched off site-wide. */
export async function assertFundraiserPagesEnabled() {
  const s = await readSiteSettings();
  if (!s.fundraiserPagesEnabled) {
    throw new Error("Fundraiser pages are paused right now.");
  }
}

/** True when the Vendor CRM tool is switched off site-wide (Super Users stay exempt). */
export async function vendorCrmPaused() {
  const s = await readSiteSettings();
  return !s.vendorCrmEnabled;
}
