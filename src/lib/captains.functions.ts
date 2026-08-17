import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RoleMemberRow } from "@/lib/roles-admin.server";

export type CaptainRow = RoleMemberRow;

export const listCaptains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CaptainRow[]> => {
    const { listMembersOfRole } = await import("@/lib/roles-admin.server");
    return listMembersOfRole(context, "captain");
  });

export const grantCaptainByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const { grantRole } = await import("@/lib/roles-admin.server");
    return grantRole(context, data.email, "captain");
  });

export const revokeCaptain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { revokeRole } = await import("@/lib/roles-admin.server");
    return revokeRole(context, data.user_id, "captain");
  });
