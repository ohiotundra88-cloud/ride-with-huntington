import { supabaseAdmin } from "@/integrations/supabase/client.server";

export { supabaseAdmin };

/** Admins and super users may manage colleague records. */
export async function assertManager(context: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
  claims?: { email?: string };
}): Promise<string> {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    context.supabase.rpc("is_admin_text", { _user_id: context.userId }),
    context.supabase.rpc("is_superuser", { _user_id: context.userId }),
  ]);
  if (!isAdmin && !isSuper) throw new Error("Forbidden — admin or super user access required.");
  return context.claims?.email ?? "admin";
}

export function demoPasswordFor(email: string) {
  return `Huntington!${email.split("@")[0]?.replace(/[^a-z0-9]/gi, "") ?? "colleague"}2027`;
}

export function appendAudit(current: unknown, what: string) {
  const list = Array.isArray(current) ? current : [];
  return [...list, { at: new Date().toISOString(), what }];
}
