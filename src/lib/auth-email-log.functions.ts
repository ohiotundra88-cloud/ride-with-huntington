import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AuthEmailLogEntry {
  id: string;
  email: string;
  email_type: string;
  subject: string | null;
  sent_at: string;
}

/** Friendly label for each kind of account email. */
export const AUTH_EMAIL_LABELS: Record<string, string> = {
  signup: "Activation code",
  magiclink: "Sign-in code",
  recovery: "Password reset",
  invite: "Invitation",
  email_change: "Email change confirmation",
  reauthentication: "Re-verification code",
};

/**
 * Super-User-only timeline of every account email the Hub has sent.
 * Read-only — RLS also restricts this table to super users.
 */
export const listAuthEmailLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<AuthEmailLogEntry[]> => {
    let query = context.supabase
      .from("auth_email_log")
      .select("id, email, email_type, subject, sent_at")
      .order("sent_at", { ascending: false })
      .limit(data.limit);

    if (data.email) query = query.ilike("email", `%${data.email.toLowerCase()}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
