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

        const ext = row.flier_path.split(".").pop()?.toLowerCase();
        const type =
          row.flier_content_type ??
          (ext === "pdf"
            ? "application/pdf"
            : ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : "image/jpeg");

        return new Response(await file.arrayBuffer(), {
          headers: {
            "Content-Type": type,
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": `inline; filename="${(row.flier_name ?? "flier").replace(/"/g, "")}"`,
          },
        });
      },
    },
  },
});
