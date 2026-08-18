import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { avatarUploadSchema, MAX_AVATAR_BYTES } from "@/lib/profile-photo.shared";

const BUCKET = "avatars";

/** My current profile photo state. */
export const getMyProfilePhoto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("profiles")
      .select("avatar_path, avatar_updated_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      userId: context.userId,
      hasPhoto: Boolean(data?.avatar_path),
      version: (data?.avatar_updated_at as string | null) ?? null,
    };
  });

export const uploadProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => avatarUploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_AVATAR_BYTES) throw new Error("Photo must be 5 MB or smaller.");

    const ext = data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const path = `${context.userId}/avatar-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prev } = await (supabaseAdmin as any)
      .from("profiles")
      .select("avatar_path")
      .eq("id", context.userId)
      .maybeSingle();

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const stamp = new Date().toISOString();
    const { error: updErr } = await (context.supabase as any)
      .from("profiles")
      .update({ avatar_path: path, avatar_content_type: data.contentType, avatar_updated_at: stamp })
      .eq("id", context.userId);
    if (updErr) throw new Error(updErr.message);

    if (prev?.avatar_path) await supabaseAdmin.storage.from(BUCKET).remove([prev.avatar_path]);
    return { ok: true, version: stamp };
  });

export const removeProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row } = await (context.supabase as any)
      .from("profiles")
      .select("avatar_path")
      .eq("id", context.userId)
      .maybeSingle();

    const { error } = await (context.supabase as any)
      .from("profiles")
      .update({ avatar_path: null, avatar_content_type: null, avatar_updated_at: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    if (row?.avatar_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([row.avatar_path]);
    }
    return { ok: true };
  });
