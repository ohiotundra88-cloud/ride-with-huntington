import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RoleMemberRow } from "@/lib/roles-admin.server";
import { MANAGEABLE_ROLES } from "@/lib/roles.shared";

export type { RoleMemberRow };

const roleSchema = z.enum(MANAGEABLE_ROLES);

export const listRoleMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ role: roleSchema }).parse(d))
  .handler(async ({ data, context }): Promise<RoleMemberRow[]> => {
    const { listMembersOfRole } = await import("@/lib/roles-admin.server");
    return listMembersOfRole(context, data.role);
  });

export const grantRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ role: roleSchema, email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const { grantRoleGuarded } = await import("@/lib/roles-admin.server");
    return grantRoleGuarded(context, data.email, data.role);
  });

export const revokeRoleFromUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ role: roleSchema, user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { revokeRoleGuarded } = await import("@/lib/roles-admin.server");
    return revokeRoleGuarded(context, data.user_id, data.role);
  });

export interface RegisteredUserRow {
  user_id: string;
  email: string;
  full_name: string | null;
}

export const searchRegisteredUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ query: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ data, context }): Promise<RegisteredUserRow[]> => {
    const { assertAdmin } = await import("@/lib/roles-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.replace(/[%,]/g, "");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .order("email", { ascending: true })
      .limit(8);
    if (error) throw new Error(error.message);
    return (profiles ?? []).map((p) => ({ user_id: p.id, email: p.email ?? "(unknown)", full_name: p.full_name }));
  });
