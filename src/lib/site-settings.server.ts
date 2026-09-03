import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings.shared";

/** Publishable-key client — the settings row is world-readable by design. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function readSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await publicClient()
    .from("site_settings")
    .select("fundraiser_pages_enabled, vendor_crm_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_SITE_SETTINGS;
  return {
    fundraiserPagesEnabled: !!data.fundraiser_pages_enabled,
    vendorCrmEnabled: !!data.vendor_crm_enabled,
  };
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
