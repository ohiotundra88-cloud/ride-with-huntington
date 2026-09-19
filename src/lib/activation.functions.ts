import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { isHuntingtonEmail, requireConfirmedHuntingtonUser } from "@/lib/huntington-email";

const MAX_FAILURES = 6;
const LOCK_MINUTES = 15;

function normalizeEmail(email: string) {
  const clean = email.trim().toLowerCase();
  if (!isHuntingtonEmail(clean)) {
    throw new Error("Only @huntington.com addresses are accepted.");
  }
  return clean;
}

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Rnd!${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Finds an auth user id for an email address (paginated admin lookup). */
async function findAuthUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = (list?.users ?? []).find(
      (u: { id: string; email?: string | null }) => (u.email ?? "").toLowerCase() === email,
    );
    if (match) return match.id;
    if ((list?.users ?? []).length < 200) break;
  }
  return null;
}

/**
 * First step of sign-in. Tells the browser which path this address takes:
 *  - "password": account is activated and has a personal password
 *  - "activate": brand new colleague — emailed passcode, then choose a password
 *  - "reset": activated before personal passwords existed — passcode, then choose one
 * Also enforces the failed-attempt lockout.
 */
export const startSignIn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: attempt } = await supabaseAdmin
      .from("signin_attempts")
      .select("locked_until")
      .eq("email_key", email)
      .maybeSingle();
    const lockedUntil = attempt?.locked_until ? new Date(attempt.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      return {
        mode: "locked" as const,
        lockedSeconds: Math.ceil((lockedUntil.getTime() - Date.now()) / 1000),
      };
    }

    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("activated_at, password_set_at")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!row?.activated_at) return { mode: "activate" as const, lockedSeconds: 0 };
    if (!row.password_set_at) return { mode: "reset" as const, lockedSeconds: 0 };
    return { mode: "password" as const, lockedSeconds: 0 };
  });

/** Records a wrong password and locks the address after repeated failures. */
export const noteSignInFailure = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("signin_attempts")
      .select("failures")
      .eq("email_key", email)
      .maybeSingle();

    const failures = (row?.failures ?? 0) + 1;
    const locked = failures >= MAX_FAILURES;
    await supabaseAdmin.from("signin_attempts").upsert(
      {
        email_key: email,
        failures: locked ? 0 : failures,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      },
      { onConflict: "email_key" },
    );
    return { locked, remaining: Math.max(0, MAX_FAILURES - failures) };
  });

/** Clears the failure counter after a successful sign-in. */
export const clearSignInFailures = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("signin_attempts").delete().eq("email_key", email);
    return { ok: true as const };
  });

/**
 * Called before emailing a passcode to an account that predates personal
 * passwords. Retires the old guessable password so it can never be used again.
 * No-op for accounts that already have a personal password (so it cannot be
 * abused to lock a colleague out).
 */
export const startLegacyPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id, password_set_at")
      .ilike("email", email)
      .maybeSingle();
    if (!row || row.password_set_at) return { ok: true as const };

    const userId = row.id ?? (await findAuthUserId(supabaseAdmin, email));
    if (!userId) return { ok: true as const };
    await supabaseAdmin.auth.admin.updateUserById(userId, { password: randomPassword() });
    return { ok: true as const };
  });

/**
 * Has this work email already completed one-time passcode activation?
 * Kept for callers that only need the activation flag.
 */
export const checkActivation = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("activated_at, password_set_at")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);

    return { activated: !!row?.activated_at, passwordSet: !!row?.password_set_at };
  });

/**
 * Called immediately after a successful passcode verification by a first-time
 * colleague. Stores the password they chose and stamps the profile activated.
 */
export const completeActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ password: z.string().min(10).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr) throw new Error(authErr.message);
    const email = requireConfirmedHuntingtonUser(authUser.user);

    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    });
    if (pwErr) throw new Error(pwErr.message);

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email, activated_at: now, password_set_at: now }, { onConflict: "id" });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("signin_attempts").delete().eq("email_key", email);
    return { ok: true as const };
  });

/**
 * Sets a new password for the signed-in caller (used after a passcode-verified
 * reset). Only ever touches the caller's own account.
 */
export const setMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ password: z.string().min(10).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr) throw new Error(authErr.message);
    const email = requireConfirmedHuntingtonUser(authUser.user);

    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    });
    if (pwErr) throw new Error(pwErr.message);

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: userId, email, activated_at: now, password_set_at: now },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("signin_attempts").delete().eq("email_key", email);
    return { ok: true as const };
  });

/** Server-side truth for the current session's activation state. */
export const getMyActivation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("activated_at, password_set_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { activated: !!data?.activated_at, passwordSet: !!data?.password_set_at };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertSuperuser(context: { supabase: any; userId: string }) {
  const { data: isSuper, error } = await context.supabase.rpc("is_superuser", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!isSuper) throw new Error("Forbidden");
}

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
    await assertSuperuser(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ activated_at: data.activated ? new Date().toISOString() : null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Super User safety net: force a colleague to pick a new password. Their
 * current password stops working immediately; next sign-in emails them a
 * 6-digit code and asks them to choose a new one. Never reveals a password.
 */
export const requirePasswordResetForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperuser(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: randomPassword(),
    });
    if (pwErr) throw new Error(pwErr.message);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ password_set_at: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * One-time cleanup: retires the old shared-formula password on every account
 * that has not yet chosen a personal one.
 */
export const invalidateLegacyPasswords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperuser(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .is("password_set_at", null);
    if (error) throw new Error(error.message);

    let changed = 0;
    for (const row of rows ?? []) {
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(row.id, {
        password: randomPassword(),
      });
      if (!pwErr) changed += 1;
    }
    return { ok: true as const, changed };
  });
