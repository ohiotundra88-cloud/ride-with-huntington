import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const TEST_EMAIL_TEMPLATES = [
  { name: "team-announcement", label: "Team announcement" },
  { name: "event-invitation", label: "Event invitation" },
  { name: "event-cancelled", label: "Event cancellation" },
  { name: "fundraiser-decision", label: "Fundraiser request decision" },
] as const;

export type TestEmailTemplateName = (typeof TEST_EMAIL_TEMPLATES)[number]["name"];

async function resolveCallerEmail(context: { supabase: any; userId: string; claims?: Record<string, unknown> }): Promise<string> {
  const claimEmail = context.claims?.["email"];
  if (typeof claimEmail === "string" && claimEmail.includes("@")) return claimEmail;
  const { data, error } = await context.supabase
    .from("profiles")
    .select("email")
    .eq("id", context.userId)
    .single();
  if (error) throw new Error(error.message);
  if (!data?.email) throw new Error("Could not determine your email address");
  return data.email;
}

async function sendOne(context: { supabase: any; userId: string; claims?: Record<string, unknown> }, templateName: string) {
  const { assertSuperUser } = await import("@/lib/roles-admin.server");
  await assertSuperUser(context);
  const { TEMPLATES } = await import("@/lib/email-templates/registry");
  const entry = TEMPLATES[templateName];
  if (!entry) throw new Error(`Unknown template: ${templateName}`);
  const to = await resolveCallerEmail(context);
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const result = await sendTemplateEmail(templateName, to, {
    templateData: entry.previewData ?? {},
    subjectPrefix: "[TEST] ",
  });
  return { template: templateName, to, ...result };
}

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ template: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => sendOne(context, data.template));

export const sendAllTestEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const results = [];
    for (const t of TEST_EMAIL_TEMPLATES) {
      results.push(await sendOne(context, t.name));
    }
    return results;
  });
