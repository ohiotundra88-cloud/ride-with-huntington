import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/fundraising-asset/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("fundraising_assets")
          .select("file_path, file_name, content_type, published")
          .eq("id", id)
          .maybeSingle();
        if (error || !row?.file_path || !row.published) {
          return new Response("Not found", { status: 404 });
        }

        const { data: file, error: dErr } = await supabaseAdmin.storage
          .from("fundraising-assets")
          .download(row.file_path);
        if (dErr || !file) return new Response("Not found", { status: 404 });

        return new Response(await file.arrayBuffer(), {
          headers: {
            "Content-Type": row.content_type ?? "application/octet-stream",
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": `inline; filename="${(row.file_name ?? "resource").replace(/"/g, "")}"`,
          },
        });
      },
    },
  },
});
