import { createServerFn } from "@tanstack/react-start";

/**
 * Increments and returns the lifetime site visit counter.
 *
 * Never throws: if the atomic increment RPC is unavailable we fall back to a
 * plain read of the stored count, and finally to `null` so the footer can show
 * a stable placeholder instead of hanging on a loading state forever.
 */
export const recordSiteVisit = createServerFn({ method: "GET" }).handler(
  async (): Promise<number | null> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error } = await supabaseAdmin.rpc("increment_site_visits" as any);
      if (!error && typeof data === "number") return data;
      if (error) console.error("[site-visits] increment failed:", error.message);

      const { data: row, error: readErr } = await supabaseAdmin
        .from("site_visits")
        .select("count")
        .eq("id", 1)
        .maybeSingle();
      if (readErr) {
        console.error("[site-visits] read failed:", readErr.message);
        return null;
      }
      return typeof row?.count === "number" ? row.count : null;
    } catch (err) {
      console.error("[site-visits] unavailable:", err instanceof Error ? err.message : err);
      return null;
    }
  },
);
