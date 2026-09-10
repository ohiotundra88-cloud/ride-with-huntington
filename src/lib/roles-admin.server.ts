export interface RoleMemberRow {
  user_id: string;
  email: string;
  full_name: string | null;
  granted_at: string;
  is_self: boolean;
}

type Ctx = { supabase: any; userId: string };

export async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

/** Admin OR super user: super user is intended as a superset of admin. */
export async function assertAdminOrSuperUser(context: Ctx) {
  const [adminRes, superRes] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("is_superuser", { _user_id: context.userId }),
  ]);
  if (adminRes.error) throw new Error(adminRes.error.message);
  if (superRes.error) throw new Error(superRes.error.message);
  if (!adminRes.data && !superRes.data) throw new Error("Forbidden: admin role required");
}

export async function listMembersOfRole(context: Ctx, role: string): Promise<RoleMemberRow[]> {
  await assertAdminOrSuperUser(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, created_at")
    .eq("role", role as never)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);
  if (pErr) throw new Error(pErr.message);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (roles ?? []).map((r) => {
    const p = map.get(r.user_id);
    return {
      user_id: r.user_id,
      email: p?.email ?? "(unknown)",
      full_name: p?.full_name ?? null,
      granted_at: r.created_at,
      is_self: r.user_id === context.userId,
    };
  });
}

export async function grantRole(context: Ctx, email: string, role: string) {
  await assertAdminOrSuperUser(context);
  const normalized = email.trim().toLowerCase();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) {
    throw new Error(
      `No colleague with email ${normalized} has signed in yet. Ask them to sign in once, then try again.`,
    );
  }
  const { error: iErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: profile.id, role: role as never }, { onConflict: "user_id,role" });
  if (iErr) throw new Error(iErr.message);
  return { ok: true, user_id: profile.id, email: profile.email, full_name: profile.full_name };
}

export async function revokeRole(context: Ctx, userId: string, role: string) {
  await assertAdminOrSuperUser(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role as never);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function assertSuperUser(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_superuser", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super user access required");
}

/**
 * Grant/revoke for the reviewer designations. Super user is intentionally
 * gated behind an existing super user — admins alone cannot mint one.
 */
export async function grantRoleGuarded(context: Ctx, email: string, role: string) {
  if (role === "superuser") await assertSuperUser(context);
  return grantRole(context, email, role);
}

export async function revokeRoleGuarded(context: Ctx, userId: string, role: string) {
  if (role === "superuser") {
    await assertSuperUser(context);
    if (userId === context.userId) throw new Error("You can't revoke your own super user access.");
  }
  return revokeRole(context, userId, role);
}
