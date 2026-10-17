import { createFileRoute } from "@tanstack/react-router";

// Aspire Identity sign-in flow (see src/server/session.server.ts).
export const Route = createFileRoute("/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { signIn } = await import("@/server/session.server");
        return signIn(request);
      },
    },
  },
});
