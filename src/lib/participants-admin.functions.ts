import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type JsonLike = Record<string, string | number | boolean | null>;

export interface ColleagueRecord {
  user_id: string;
  email: string;
  full_name: string | null;
  participation: string | null;
  reg_id: string | null;
  pelotonia: JsonLike;
  travel: JsonLike;
  bike: JsonLike;
  apparel: JsonLike;
  address: JsonLike;
  submitted_at: string | null;
  last_sign_in_at: string | null;
  manual_entry: boolean;
  season_locked: boolean;
  season: string;
  updated_at: string;
  created_at: string;
}

const jsonRecord = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

const saveSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120).optional(),
  participation: z.enum(["rider", "volunteer", "both", "unsure"]).nullable().optional(),
  reg_id: z.string().trim().max(60).nullable().optional(),
  pelotonia: jsonRecord.optional(),
  travel: jsonRecord.optional(),
  bike: jsonRecord.optional(),
  apparel: jsonRecord.optional(),
  address: jsonRecord.optional(),
  submitted_at: z.string().nullable().optional(),
  season_locked: z.boolean().optional(),
});

export const listColleagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ColleagueRecord[]> => {
    const { supabaseAdmin, assertManager } = await import("@/lib/participants-admin.server");
    await assertManager(context);
    const { data, error } = await supabaseAdmin
      .from("participants")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", rows.map((r: { user_id: string }) => r.user_id));
    const map = new Map((profiles ?? []).map((p: { id: string; email: string | null; full_name: string | null }) => [p.id, p] as const));

    // Last sign-in comes from the auth directory (not mirrored into profiles).
    const signIns = new Map<string, string | null>();
    for (let page = 1; page <= 5; page++) {
      const { data: list, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (authErr) break;
      const users = list?.users ?? [];
      for (const u of users) signIns.set(u.id, u.last_sign_in_at ?? null);
      if (users.length < 1000) break;
    }
    return rows.map((r) => ({
      user_id: r.user_id,
      email: map.get(r.user_id)?.email ?? "(unknown)",
      full_name: map.get(r.user_id)?.full_name ?? null,
      participation: r.participation,
      reg_id: r.reg_id,
      pelotonia: (r.pelotonia ?? {}) as JsonLike,
      travel: (r.travel ?? {}) as JsonLike,
      bike: (r.bike ?? {}) as JsonLike,
      apparel: (r.apparel ?? {}) as JsonLike,
      address: (r.address ?? {}) as JsonLike,
      submitted_at: r.submitted_at,
      manual_entry: r.manual_entry,
      season_locked: r.season_locked,
      season: r.season,
      updated_at: r.updated_at,
      created_at: r.created_at,
    }));
  });

export const saveColleague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, assertManager, appendAudit } = await import("@/lib/participants-admin.server");
    const actor = await assertManager(context);
    const { user_id, full_name, ...fields } = data;

    if (full_name) {
      const { error } = await supabaseAdmin.from("profiles").update({ full_name }).eq("id", user_id);
      if (error) throw new Error(error.message);
    }

    const { data: existing } = await supabaseAdmin
      .from("participants")
      .select("audit")
      .eq("user_id", user_id)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("participants")
      .upsert(
        {
          user_id,
          ...fields,
          audit: appendAudit(existing?.audit, `Edited by ${actor} (admin)`),
        } as never,
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createColleague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        full_name: z.string().trim().min(2).max(120),
        participation: z.enum(["rider", "volunteer", "both", "unsure"]).default("rider"),
        season_locked: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, assertManager, demoPasswordFor } = await import("@/lib/participants-admin.server");
    const actor = await assertManager(context);

    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: demoPasswordFor(data.email),
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not create that colleague's account.");

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, full_name: data.full_name }, { onConflict: "id" });
    if (pErr) throw new Error(pErr.message);

    const { error: partErr } = await supabaseAdmin.from("participants").upsert(
      {
        user_id: userId,
        participation: data.participation,
        manual_entry: true,
        season_locked: data.season_locked,
        audit: [{ at: new Date().toISOString(), what: `Added by ${actor} (admin)` }],
      } as never,
      { onConflict: "user_id" },
    );
    if (partErr) throw new Error(partErr.message);
    return { ok: true, user_id: userId, email: data.email };
  });

export const deleteColleague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), mode: z.enum(["registration", "account"]).default("registration") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, assertManager } = await import("@/lib/participants-admin.server");
    await assertManager(context);
    if (data.user_id === context.userId) throw new Error("You can't delete your own record.");

    if (data.mode === "account") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
      if (error) throw new Error(error.message);
      return { ok: true, mode: data.mode };
    }
    const { error } = await supabaseAdmin.from("participants").delete().eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true, mode: data.mode };
  });
