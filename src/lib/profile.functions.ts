import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Personal fields a colleague may set on their own profile.
 * Privileged columns (has_vendor_dashboard_access, activated_at,
 * password_set_at) are deliberately absent and can never be written here.
 */
const profileFieldsSchema = z.object({
  email: z.string().email().max(320).optional(),
  full_name: z.string().max(200).optional(),
  mobile: z.string().max(40).optional(),
  segment: z.string().max(120).optional(),
  market: z.string().max(120).optional(),
  manager: z.string().max(200).optional(),
  consent: z.boolean().optional(),
});

export type ProfileFields = z.infer<typeof profileFieldsSchema>;

/**
 * Creates the signed-in colleague's profile row if it is missing, then writes
 * the whitelisted personal fields. Used as a fallback when the browser-side
 * column-scoped update matches zero rows (no profile row yet).
 */
export const ensureMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    profileFieldsSchema.parse((data as { fields?: unknown })?.fields ?? data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: Record<string, unknown> = { id: context.userId };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) payload[key] = value;
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(payload as never, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
