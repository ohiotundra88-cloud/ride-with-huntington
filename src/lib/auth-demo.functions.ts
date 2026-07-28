import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HUNTINGTON_DOMAIN = "huntington.com";

// Demo-mode: ensure an account exists for the given @huntington.com email
// with a caller-provided deterministic password. Verification codes are
// temporarily disabled — this replaces the OTP flow. Safe to call for both
// new and existing users; for existing users we reset their password so
// sign-in works even if they were created earlier via the OTP flow.
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
