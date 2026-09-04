/**
 * Records every sign-in / account email the Hub sends, so a Super User can see
 * exactly what went out, to whom, and when when troubleshooting delivery.
 * Fire-and-forget: a logging failure must never block the email itself.
 */
export async function logAuthEmail(input: { email: string; type: string; subject?: string }) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("auth_email_log").insert({
      email: (input.email ?? "").trim().toLowerCase(),
      email_type: input.type,
      subject: input.subject ?? null,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[auth-email-log] could not record send", err);
  }
}
