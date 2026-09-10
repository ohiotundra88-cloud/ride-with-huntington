import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
export interface ParticipantRow {
  user_id: string;
  participation: string | null;
  pelotonia: Json;
  travel: Json;
  bike: Json;
  apparel: Json;
  address: Json;
  audit: Json;
  submitted_at: string | null;
  reg_id: string | null;
  updated_at: string;
}

export const getMyParticipant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("participants")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return (data as ParticipantRow | null) ?? null;
  });

const upsertSchema = z.object({
  participation: z.string().nullable().optional(),
  pelotonia: z.any().optional(),
  travel: z.any().optional(),
  bike: z.any().optional(),
  apparel: z.any().optional(),
  address: z.any().optional(),
  audit: z.any().optional(),
  submitted_at: z.string().nullable().optional(),
  reg_id: z.string().nullable().optional(),
});

export const upsertMyParticipant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("participants")
      .upsert(
        { user_id: context.userId, ...data },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return row as ParticipantRow;
  });

export const listParticipantsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdminOrSuperUser } = await import("@/lib/roles-admin.server");
    await assertAdminOrSuperUser(context);
    const { data, error } = await context.supabase
      .from("participants")
      .select("*, profiles(email, full_name)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
