import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BRANDING_COLUMNS,
  brandingRemoveSchema,
  brandingSettingsSchema,
  brandingUploadSchema,
  defaultBranding,
  MAX_BRANDING_BYTES,
  type SiteBranding,
} from "@/lib/branding.shared";

/** Public read — used by the landing page and header. */
export const getBranding = createServerFn({ method: "GET" }).handler(async (): Promise<SiteBranding> => {
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
  const { data, error } = await client.from("site_branding").select(BRANDING_COLUMNS).eq("id", 1).maybeSingle();
  if (error) return defaultBranding;
  return (data as SiteBranding | null) ?? defaultBranding;
});

async function assertBrandingManager(context: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    context.supabase.rpc("is_admin_text", { _user_id: context.userId }),
    context.supabase.rpc("is_superuser", { _user_id: context.userId }),
  ]);
  if (!isAdmin && !isSuper) throw new Error("Only admins and super users can change site branding.");
}

export const saveBrandingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => brandingSettingsSchema.parse(d))
  .handler(async ({ data, context }): Promise<SiteBranding> => {
    await assertBrandingManager(context as any);
    const { data: row, error } = await context.supabase
      .from("site_branding")
      .update({
        hero_overlay: data.hero_overlay,
        hero_position: data.hero_position,
        hero_text_color: data.hero_text_color,
        hero_accent_color: data.hero_accent_color,
        hero_supporting_color: data.hero_supporting_color,
        hero_primary_button_color: data.hero_primary_button_color,
        hero_secondary_button_color: data.hero_secondary_button_color,
        updated_by: context.userId,
      })
      .eq("id", 1)
      .select(BRANDING_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as SiteBranding;
  });

export const uploadBrandingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => brandingUploadSchema.parse(d))
  .handler(async ({ data, context }): Promise<SiteBranding> => {
    await assertBrandingManager(context as any);
    if (!data.contentType.startsWith("image/")) throw new Error("Please choose an image file.");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BRANDING_BYTES) throw new Error("Image must be 8 MB or smaller.");

    const ext = data.fileName.includes(".") ? data.fileName.split(".").pop()!.toLowerCase() : "png";
    const path = `${data.kind}/${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("branding")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { data: prev } = await context.supabase.from("site_branding").select(BRANDING_COLUMNS).eq("id", 1).maybeSingle();
    const oldPath = data.kind === "hero" ? (prev as any)?.hero_path : (prev as any)?.logo_path;

    const patch =
      data.kind === "hero"
        ? { hero_path: path, hero_name: data.fileName, hero_content_type: data.contentType }
        : { logo_path: path, logo_name: data.fileName, logo_content_type: data.contentType };

    const { data: row, error } = await context.supabase
      .from("site_branding")
      .update({ ...patch, updated_by: context.userId })
      .eq("id", 1)
      .select(BRANDING_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    if (oldPath && oldPath !== path) await supabaseAdmin.storage.from("branding").remove([oldPath]);
    return row as unknown as SiteBranding;
  });

export const removeBrandingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => brandingRemoveSchema.parse(d))
  .handler(async ({ data, context }): Promise<SiteBranding> => {
    await assertBrandingManager(context as any);
    const { data: prev } = await context.supabase.from("site_branding").select(BRANDING_COLUMNS).eq("id", 1).maybeSingle();
    const oldPath = data.kind === "hero" ? (prev as any)?.hero_path : (prev as any)?.logo_path;

    const patch =
      data.kind === "hero"
        ? { hero_path: null, hero_name: null, hero_content_type: null }
        : { logo_path: null, logo_name: null, logo_content_type: null };

    const { data: row, error } = await context.supabase
      .from("site_branding")
      .update({ ...patch, updated_by: context.userId })
      .eq("id", 1)
      .select(BRANDING_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    if (oldPath) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("branding").remove([oldPath]);
    }
    return row as unknown as SiteBranding;
  });
