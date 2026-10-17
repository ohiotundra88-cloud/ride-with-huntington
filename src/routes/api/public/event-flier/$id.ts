import { safeFileHeaders, typeFromPath } from "@/lib/safe-file.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/event-flier/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("events")
          .select("flier_path, flier_name, published")
          .eq("id", id)
          .maybeSingle();
        if (error || !row?.flier_path || !row.published) {
          return new Response("Not found", { status: 404 });
        }

        const { data: file, error: dErr } = await supabaseAdmin.storage
          .from("event-fliers")
          .download(row.flier_path);
        if (dErr || !file) return new Response("Not found", { status: 404 });

        return new Response(await file.arrayBuffer(), {
          headers: safeFileHeaders({
            contentType: typeFromPath(row.flier_path) ?? "image/jpeg",
            fileName: row.flier_name ?? "flier",
          }),
        });
      },
    },
  },
});
