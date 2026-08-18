import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ASSET_COLUMNS,
  assetFileSchema,
  assetIdSchema,
  assetInputSchema,
  MAX_ASSET_BYTES,
  type FundraisingAsset,
} from "@/lib/fundraising.shared";

/** Public library — published assets only. */
export const listPublicAssets = createServerFn({ method: "GET" }).handler(
  async (): Promise<FundraisingAsset[]> => {
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
      .from("fundraising_assets")
      .select(ASSET_COLUMNS)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FundraisingAsset[];
  },
);

/** Captains/admins see drafts too. */
export const listManageableAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraisingAsset[]> => {
    const { data, error } = await context.supabase
      .from("fundraising_assets")
      .select(ASSET_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FundraisingAsset[];
  });

export const saveAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assetInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<FundraisingAsset> => {
    const { data: allowed, error: rErr } = await context.supabase.rpc("can_manage_events", {
      _user_id: context.userId,
    });
    if (rErr) throw new Error(rErr.message);
    if (!allowed) throw new Error("Only captains and admins can manage fundraising resources.");

    const payload = {
      title: data.title,
      description: data.description ?? "",
      category: data.category,
      suggested_caption: data.suggested_caption,
      link_url: data.link_url,
      published: data.published,
      sort_order: data.sort_order,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("fundraising_assets")
        .update(payload)
        .eq("id", data.id)
        .select(ASSET_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return row as unknown as FundraisingAsset;
    }

    const { data: row, error } = await context.supabase
      .from("fundraising_assets")
      .insert({ ...payload, created_by: context.userId })
      .select(ASSET_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as FundraisingAsset;
  });

export const deleteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assetIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("fundraising_assets")
      .select("id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("fundraising_assets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.file_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("fundraising-assets").remove([row.file_path]);
    }
    return { ok: true };
  });

/** Upload (or replace) the downloadable file on an asset. */
export const uploadAssetFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assetFileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: sErr } = await context.supabase
      .from("fundraising_assets")
      .select("id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!row) throw new Error("Resource not found");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_ASSET_BYTES) throw new Error("File must be 15 MB or smaller.");

    const ext = data.fileName.includes(".") ? data.fileName.split(".").pop()!.toLowerCase() : "bin";
    const path = `${data.id}/asset-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("fundraising-assets")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await context.supabase
      .from("fundraising_assets")
      .update({ file_path: path, file_name: data.fileName, content_type: data.contentType })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (row.file_path) await supabaseAdmin.storage.from("fundraising-assets").remove([row.file_path]);
    return { ok: true, file_path: path };
  });

export const removeAssetFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assetIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("fundraising_assets")
      .select("id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Resource not found");
    const { error: updErr } = await context.supabase
      .from("fundraising_assets")
      .update({ file_path: null, file_name: null, content_type: null })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    if (row.file_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("fundraising-assets").remove([row.file_path]);
    }
    return { ok: true };
  });
