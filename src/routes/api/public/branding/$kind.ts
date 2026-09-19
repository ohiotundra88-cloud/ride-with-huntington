import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/branding/$kind")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const kind = params.kind;
        if (kind !== "hero" && kind !== "logo") return new Response("Not found", { status: 404 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row, error } = await supabaseAdmin
            .from("site_branding")
            .select("hero_path, hero_content_type, logo_path, logo_content_type")
            .eq("id", 1)
            .maybeSingle();
          if (error || !row) return new Response("Not found", { status: 404 });

          const path = kind === "hero" ? row.hero_path : row.logo_path;
          const contentType = kind === "hero" ? row.hero_content_type : row.logo_content_type;
          if (!path) return new Response("Not found", { status: 404 });

          const { data: file, error: dErr } = await supabaseAdmin.storage
            .from("branding")
            .download(path);
          if (dErr || !file) return new Response("Not found", { status: 404 });

          return new Response(await file.arrayBuffer(), {
            headers: {
              "Content-Type": contentType ?? "image/png",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (err) {
          // Missing server credentials or storage outage: behave like "no image"
          // instead of a 500 so the page falls back to its default artwork.
          console.error("[branding] unavailable:", err instanceof Error ? err.message : err);
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
