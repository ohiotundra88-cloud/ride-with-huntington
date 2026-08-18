import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuper, demoPassword } from "@/lib/season.server";

export interface ManualParticipantRow {
  user_id: string;
  email: string;
  full_name: string | null;
  participation: string | null;
  season: string;
  created_at: string;
}

export const listManualParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManualParticipantRow[]> => {
    await assertSuper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("participants")
      .select("user_id, participation, season, created_at")
      .eq("manual_entry", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", rows.map((r) => r.user_id));
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      user_id: r.user_id,
      email: map.get(r.user_id)?.email ?? "(unknown)",
      full_name: map.get(r.user_id)?.full_name ?? null,
      participation: r.participation,
      season: r.season,
      created_at: r.created_at,
    }));
  });

export const createManualParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        full_name: z.string().trim().min(2).max(120),
        participation: z.enum(["rider", "volunteer", "both", "unsure"]).default("rider"),
        roles: z.array(z.enum(["captain", "legal", "risk", "compliance", "marketing", "cochair", "admin"])).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: demoPassword(data.email),
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      });
      if (cErr) throw new Error(cErr.message);
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not create the colleague's account.");

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, full_name: data.full_name }, { onConflict: "id" });
    if (pErr) throw new Error(pErr.message);

    const { error: partErr } = await supabaseAdmin.from("participants").upsert(
      {
        user_id: userId,
        participation: data.participation,
        manual_entry: true,
        season_locked: true,
      },
      { onConflict: "user_id" },
    );
    if (partErr) throw new Error(partErr.message);

    if (data.roles.length > 0) {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          data.roles.map((role) => ({ user_id: userId!, role: role as never })),
          { onConflict: "user_id,role" },
        );
      if (rErr) throw new Error(rErr.message);
    }

    return { ok: true, user_id: userId, email: data.email };
  });

export const removeManualParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuper(context);
    if (data.user_id === context.userId) throw new Error("You can't remove your own record.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** End-of-season cleanup: clears season registrations, keeps roles + manual records. */
export const resetSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ confirm: z.literal("RESET SEASON") }).parse(d))
  .handler(async ({ context }) => {
    await assertSuper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cleared, error } = await supabaseAdmin
      .from("participants")
      .delete()
      .eq("manual_entry", false)
      .eq("season_locked", false)
      .select("user_id");
    if (error) throw new Error(error.message);
    const { count: kept } = await supabaseAdmin
      .from("participants")
      .select("user_id", { count: "exact", head: true });
    return { ok: true, cleared: cleared?.length ?? 0, kept: kept ?? 0 };
  });
