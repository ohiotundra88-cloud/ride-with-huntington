import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RoleMemberRow } from "@/lib/roles-admin.server";
import { MANAGEABLE_ROLES } from "@/lib/roles.shared";

export type { RoleMemberRow };

const roleSchema = z.enum(MANAGEABLE_ROLES);

export const listRoleMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ role: roleSchema }).parse(d))
  .handler(async ({ data, context }): Promise<RoleMemberRow[]> => {
    const { listMembersOfRole } = await import("@/lib/roles-admin.server");
    return listMembersOfRole(context, data.role);
  });

export const grantRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ role: roleSchema, email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const { grantRoleGuarded } = await import("@/lib/roles-admin.server");
    return grantRoleGuarded(context, data.email, data.role);
  });

export const revokeRoleFromUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ role: roleSchema, user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { revokeRoleGuarded } = await import("@/lib/roles-admin.server");
    return revokeRoleGuarded(context, data.user_id, data.role);
  });
