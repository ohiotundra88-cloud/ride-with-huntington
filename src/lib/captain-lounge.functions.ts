import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MAX_DOC_BYTES,
  POST_COLUMNS,
  postFileSchema,
  postIdSchema,
  postInputSchema,
  type CaptainPost,
} from "@/lib/captain-lounge.shared";

const BUCKET = "captain-docs";

async function assertLeader(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_leadership", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The Captains Lounge is limited to captains and team leadership.");
}

/** Who am I in the lounge? */
export const getLoungeAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r: { role: string }) => String(r.role));
    const allowed =
      roles.some((r: string) =>
        ["captain", "admin", "superuser", "legal", "risk", "compliance", "marketing", "cochair"].includes(r),
      );
    return { roles, allowed, userId: context.userId };
  });

export const listLoungePosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CaptainPost[]> => {
    await assertLeader(context as any);
    const { data, error } = await context.supabase
      .from("captain_posts")
      .select(POST_COLUMNS)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const posts = (data ?? []) as unknown as CaptainPost[];
    const ids = Array.from(new Set(posts.map((p) => p.created_by).filter(Boolean)));
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      for (const post of posts) {
        const prof = byId.get(post.created_by);
        post.author_name = prof?.full_name ?? null;
        post.author_email = prof?.email ?? null;
      }
    }
    return posts;
  });

export const saveLoungePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => postInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<CaptainPost> => {
    await assertLeader(context as any);
    const payload = {
      title: data.title,
      body: data.body,
      category: data.category,
      pinned: data.pinned,
      published: data.published,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("captain_posts")
        .update(payload)
        .eq("id", data.id)
        .select(POST_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return row as unknown as CaptainPost;
    }
    const { data: row, error } = await context.supabase
      .from("captain_posts")
      .insert({ ...payload, created_by: context.userId })
      .select(POST_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as CaptainPost;
  });

export const deleteLoungePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => postIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertLeader(context as any);
    const { data: row } = await context.supabase
      .from("captain_posts")
      .select("id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("captain_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.file_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
    }
    return { ok: true };
  });

export const uploadLoungeFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => postFileSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertLeader(context as any);
    const { data: row, error } = await context.supabase
      .from("captain_posts")
      .select("id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Post not found");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_DOC_BYTES) throw new Error("File must be 15 MB or smaller.");

    const ext = data.fileName.includes(".") ? data.fileName.split(".").pop()!.toLowerCase() : "bin";
    const path = `${data.id}/doc-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await context.supabase
      .from("captain_posts")
      .update({ file_path: path, file_name: data.fileName, content_type: data.contentType })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (row.file_path) await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
    return { ok: true, file_path: path };
  });

export const removeLoungeFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => postIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertLeader(context as any);
    const { data: row, error } = await context.supabase
      .from("captain_posts")
      .select("id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Post not found");
    const { error: updErr } = await context.supabase
      .from("captain_posts")
      .update({ file_path: null, file_name: null, content_type: null })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    if (row.file_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
    }
    return { ok: true };
  });

/** Role-gated, same-origin document fetch (VPN friendly — no external storage host). */
export const getLoungeFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => postIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertLeader(context as any);
    const { data: row, error } = await context.supabase
      .from("captain_posts")
      .select("file_path, file_name, content_type")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.file_path) throw new Error("No document attached to this post.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: file, error: dErr } = await supabaseAdmin.storage.from(BUCKET).download(row.file_path);
    if (dErr || !file) throw new Error("Document could not be downloaded.");
    const buf = Buffer.from(await file.arrayBuffer());
    return {
      base64: buf.toString("base64"),
      fileName: row.file_name ?? "document",
      contentType: row.content_type ?? "application/octet-stream",
    };
  });
