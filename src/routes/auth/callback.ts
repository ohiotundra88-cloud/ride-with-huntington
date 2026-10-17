import { createFileRoute } from "@tanstack/react-router";

// Aspire Identity sign-in flow (see src/server/session.server.ts).
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { completeSignIn } = await import("@/server/session.server");
        return completeSignIn(request);
      },
    },
  },
});
