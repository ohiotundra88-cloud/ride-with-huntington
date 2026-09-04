import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
// Replaces generated attachSupabaseAuth: reads the session from the
// same-origin proxied client so no browser request hits the backend host.
import { attachSupabaseAuthSameOrigin } from "@/lib/supabase-auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Email/webhook routes must never be redirected or wrapped.
  if (new URL(request.url).pathname.startsWith("/lovable/")) return next();
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuthSameOrigin],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
