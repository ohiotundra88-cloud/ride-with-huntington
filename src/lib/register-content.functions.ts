import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_REGISTER_CONTENT,
  mergeRegisterContent,
  registerContentSchema,
  type RegisterContent,
} from "@/lib/register-content.shared";

export { DEFAULT_REGISTER_CONTENT, type RegisterContent } from "@/lib/register-content.shared";

/** Public read — the Register page is reachable before sign-in. */
export const getRegisterContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<RegisterContent> => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const client = createClient(process.env["SUPABASE_URL"]!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input: any, init: any) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      const { data, error } = await client
        .from("register_content")
        .select("content")
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) return DEFAULT_REGISTER_CONTENT;
      return mergeRegisterContent(data.content);
    } catch {
      return DEFAULT_REGISTER_CONTENT;
    }
  },
);

export const saveRegisterContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => registerContentSchema.parse((d as { content: unknown })?.content ?? d))
  .handler(async ({ data, context }): Promise<RegisterContent> => {
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      context.supabase.rpc("is_admin_text", { _user_id: context.userId }),
      context.supabase.rpc("is_superuser", { _user_id: context.userId }),
    ]);
    if (!isAdmin && !isSuper) throw new Error("Only admins and super users can change the Register page.");

    const merged = mergeRegisterContent(data);
    const { error } = await context.supabase
      .from("register_content")
      .upsert({ id: 1, content: merged as unknown as Record<string, unknown>, updated_by: context.userId });
    if (error) throw new Error(error.message);
    return merged;
  });
