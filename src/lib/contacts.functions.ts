import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CONTACT_COLUMNS,
  contactDeleteSchema,
  contactSaveSchema,
  type DirectoryContact,
} from "@/lib/contacts.shared";

/** RLS lets admins/super users see hidden rows and everyone else see active ones. */
export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DirectoryContact[]> => {
    const { data, error } = await context.supabase
      .from("contacts")
      .select(CONTACT_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DirectoryContact[];
  });

async function assertContactManager(context: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    context.supabase.rpc("is_admin_text", { _user_id: context.userId }),
    context.supabase.rpc("is_superuser", { _user_id: context.userId }),
  ]);
  if (!isAdmin && !isSuper) throw new Error("Only admins and super users can change the contact directory.");
}

export const saveContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contactSaveSchema.parse(d))
  .handler(async ({ data, context }): Promise<DirectoryContact> => {
    await assertContactManager(context as any);

    const patch = {
      ...data.values,
      updated_by: context.userId,
      updated_by_email: (context.claims as any)?.email ?? null,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("contacts")
        .update(patch)
        .eq("id", data.id)
        .select(CONTACT_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return row as unknown as DirectoryContact;
    }

    const { data: row, error } = await context.supabase
      .from("contacts")
      .insert(patch)
      .select(CONTACT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as DirectoryContact;
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contactDeleteSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertContactManager(context as any);
    const { error } = await context.supabase.from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
