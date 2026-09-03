import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HUNTINGTON_DOMAIN = "huntington.com";

// Instant sign-in path for ALREADY ACTIVATED accounts only. First-time users
// must verify a one-time passcode emailed to their @huntington.com mailbox
// (see activation.functions.ts) — this function refuses to touch an account
// that has not been activated yet, so the passcode step cannot be skipped.
export const ensureDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(12),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email.endsWith(`@${HUNTINGTON_DOMAIN}`)) {
      throw new Error("Only @huntington.com addresses are accepted.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("activated_at")
      .ilike("email", email)
      .maybeSingle();
    if (!profile?.activated_at) {
      throw new Error("This account needs to be activated with an emailed passcode first.");
    }


    // Look up existing user by email via admin listUsers (paginated).
    let existingId: string | null = null;
    let page = 1;
    // Cap pagination defensively.
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (match) {
        existingId = match.id;
        break;
      }
      if (list.users.length < 200) break;
      page += 1;
    }

    if (existingId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      return { ok: true as const, created: false };
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, created: true };
  });
