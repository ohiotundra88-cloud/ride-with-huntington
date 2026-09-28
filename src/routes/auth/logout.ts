import { createFileRoute } from "@tanstack/react-router";

// Aspire Identity sign-in flow (see src/server/session.server.ts).
export const Route = createFileRoute("/auth/logout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { signOut } = await import("@/server/session.server");
        return signOut(request);
      },
    },
  },
});
