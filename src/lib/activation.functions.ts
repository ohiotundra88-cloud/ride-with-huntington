import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const HUNTINGTON_DOMAIN = "huntington.com";

function normalizeEmail(email: string) {
  const clean = email.trim().toLowerCase();
  if (!clean.endsWith(`@${HUNTINGTON_DOMAIN}`)) {
    throw new Error("Only @huntington.com addresses are accepted.");
  }
  return clean;
}

/**
 * Has this work email already completed one-time passcode activation?
 * Used by the sign-in screen to decide between instant sign-in and the
 * emailed verification code step.
 */
export const checkActivation = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("activated_at")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);

    return { activated: !!row?.activated_at };
  });

/**
 * Called immediately after a successful passcode verification. Stamps the
 * profile as activated and stores the deterministic password so subsequent
 * sign-ins are instant. Server-side only — a user cannot set this flag on
 * themselves through the Data API (blocked by a database trigger).
 */
export const completeActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ password: z.string().min(12) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr) throw new Error(authErr.message);
    const email = (authUser.user?.email ?? "").toLowerCase();
    if (!email.endsWith(`@${HUNTINGTON_DOMAIN}`)) {
      throw new Error("Only @huntington.com addresses are accepted.");
    }

    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
      email_confirm: true,
    });
    if (pwErr) throw new Error(pwErr.message);

    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email, activated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

/** Server-side truth for the current session's activation state. */
export const getMyActivation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("activated_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { activated: !!data?.activated_at };
  });

/**
 * Super User escape hatch: manually mark a colleague activated (or revoke it)
 * when passcode email delivery fails entirely.
 */
export const setActivationForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), activated: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isSuper, error: roleErr } = await context.supabase.rpc("is_superuser", {
      _user_id: context.userId,
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isSuper) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ activated_at: data.activated ? new Date().toISOString() : null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
