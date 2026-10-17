import { safeFileHeaders, typeFromPath } from "@/lib/safe-file.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/fundraiser-flier/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("fundraisers")
          .select("flier_path, flier_name, flier_content_type, status")
          .eq("id", id)
          .maybeSingle();
        if (
          error ||
          !row?.flier_path ||
          !["live", "closed", "paid_out"].includes(String(row.status))
        ) {
          return new Response("Not found", { status: 404 });
        }

        const { data: file, error: dErr } = await supabaseAdmin.storage
          .from("event-fliers")
          .download(row.flier_path);
        if (dErr || !file) return new Response("Not found", { status: 404 });

        return new Response(await file.arrayBuffer(), {
          headers: safeFileHeaders({
            contentType: row.flier_content_type ?? typeFromPath(row.flier_path),
            fileName: row.flier_name ?? "flier",
          }),
        });
      },
    },
  },
});
