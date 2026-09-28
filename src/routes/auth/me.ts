import { createFileRoute } from "@tanstack/react-router";

/** The signed-in person (or null) for the browser app. Never cached. */
export const Route = createFileRoute("/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { currentUser } = await import("@/server/session.server");
        let user = null;
        try {
          const u = await currentUser(request);
          user = u ? { id: u.id, email: u.email, name: u.name } : null;
        } catch (e) {
          console.error("[auth/me]", e instanceof Error ? e.message : e);
        }
        return Response.json({ user }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
