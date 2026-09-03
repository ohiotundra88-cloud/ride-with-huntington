import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SiteSettings } from "@/lib/site-settings.shared";

export { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings.shared";


/** Readable by everyone (including signed-out visitors and SSR). */
export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    const { readSiteSettings } = await import("@/lib/site-settings.server");
    return readSiteSettings();
  },
);

export const setFundraiserPagesEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<SiteSettings> => {
    const { data: allowed, error: rErr } = await context.supabase.rpc("is_superuser", {
      _user_id: context.userId,
    });
    if (rErr) throw new Error(rErr.message);
    if (!allowed) throw new Error("Only Super Users can change site switches.");

    const { error } = await context.supabase
      .from("site_settings")
      .update({ fundraiser_pages_enabled: data.enabled, updated_by: context.userId })
      .eq("id", 1);
    if (error) throw new Error(error.message);

    return { fundraiserPagesEnabled: data.enabled };
  });
