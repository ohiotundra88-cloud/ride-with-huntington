import { createFileRoute } from "@tanstack/react-router";

// Same-origin profile photo passthrough (corporate VPN friendly).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/avatar/$userId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const userId = params.userId;
        if (!UUID.test(userId)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await (supabaseAdmin as any)
          .from("profiles")
          .select("avatar_path, avatar_content_type")
          .eq("id", userId)
          .maybeSingle();
        if (error || !row?.avatar_path) return new Response("Not found", { status: 404 });

        const { data: file, error: dErr } = await supabaseAdmin.storage
          .from("avatars")
          .download(row.avatar_path);
        if (dErr || !file) return new Response("Not found", { status: 404 });

        return new Response(await file.arrayBuffer(), {
          headers: {
            "Content-Type": row.avatar_content_type ?? "image/jpeg",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
