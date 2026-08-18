import { createServerFn } from "@tanstack/react-start";

export const recordSiteVisit = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("increment_site_visits" as any);
  if (error) throw new Error(error.message);
  return (data ?? 0) as number;
});
