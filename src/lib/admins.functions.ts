import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  granted_at: string;
  is_self: boolean;
}

async function assertCallerIsAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    await assertCallerIsAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });
    if (rErr) throw new Error(rErr.message);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (roles ?? []).map((r) => {
      const p = pMap.get(r.user_id);
      return {
        user_id: r.user_id,
        email: p?.email ?? "(unknown)",
        full_name: p?.full_name ?? null,
        granted_at: r.created_at,
        is_self: r.user_id === context.userId,
      };
    });
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    const normalized = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", normalized)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) {
      throw new Error(`No colleague with email ${normalized} has signed in yet. Ask them to sign in once, then grant admin.`);
    }
    const { error: iErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "admin" }, { onConflict: "user_id,role" });
    if (iErr) throw new Error(iErr.message);
    return { ok: true, user_id: profile.id, email: profile.email, full_name: profile.full_name };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("You cannot revoke your own admin role. Ask another admin to do it.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
