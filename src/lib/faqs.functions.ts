import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface FaqRow {
  id: string;
  source_id: string | null;
  title: string;
  category: string;
  keywords: string[];
  body: string;
  hidden: boolean;
  is_builtin: boolean;
  updated_at: string;
}

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listFaqsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverPublicClient();
  const { data, error } = await sb
    .from("faqs")
    .select("id, source_id, title, category, keywords, body, hidden, is_builtin, updated_at")
    .eq("hidden", false)
    .order("category")
    .order("title");
  if (error) throw error;
  return (data ?? []) as FaqRow[];
});

export const listFaqsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminOrSuperUser } = await import("@/lib/roles-admin.server");
    await assertAdminOrSuperUser(context);
    const { data, error } = await context.supabase
      .from("faqs")
      .select("*")
      .order("category")
      .order("title");
    if (error) throw error;
    return (data ?? []) as FaqRow[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  body: z.string().min(1),
  hidden: z.boolean().optional(),
});

export const upsertFaqAdmin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => upsertSchema.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdminOrSuperUser } = await import("@/lib/roles-admin.server");
    await assertAdminOrSuperUser(context);
    if (data.id) {
      const { error, data: row } = await context.supabase
        .from("faqs")
        .update({
          title: data.title,
          category: data.category,
          keywords: data.keywords,
          body: data.body,
          ...(data.hidden !== undefined ? { hidden: data.hidden } : {}),
        })
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      return row as FaqRow;
    }
    const { error, data: row } = await context.supabase
      .from("faqs")
      .insert({
        title: data.title,
        category: data.category,
        keywords: data.keywords,
        body: data.body,
        is_builtin: false,
      })
      .select()
      .single();
    if (error) throw error;
    return row as FaqRow;
  });

export const toggleFaqHiddenAdmin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("faqs")
      .update({ hidden: data.hidden })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteFaqAdmin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("faqs").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
