import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Db } from "@/server/backend.server";

/** What requireSupabaseAuth gives a server-function handler as `context`. */
export interface AuthContext {
  /** Database client acting as the signed-in person (row-level security applies). */
  supabase: Db;
  userId: string;
  claims: { sub: string; email: string; name?: string };
}

/**
 * Server-function middleware: requires a signed-in person and gives the
 * handler a database client that acts as them (row-level security applies).
 * The name is kept from the original Supabase setup so handlers are unchanged.
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request) throw new Error("Unauthorized: no request");

    const { currentUser } = await import("@/server/session.server");
    const user = await currentUser(request);
    if (!user) throw new Error("Unauthorized: please sign in again.");

    const { createDbClient } = await import("@/server/backend.server");
    const supabase = createDbClient("authenticated", { id: user.id, email: user.email });

    const context: AuthContext = {
      supabase,
      userId: user.id,
      claims: { sub: user.id, email: user.email, name: user.name },
    };
    return next({ context });
  },
);
