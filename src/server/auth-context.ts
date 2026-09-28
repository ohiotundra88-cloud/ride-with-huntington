import { getRequest } from "@tanstack/react-start/server";
import { currentUser } from "./session.server";
import { createDbClient } from "./backend.server";
import type { AuthContext } from "@/integrations/supabase/auth-middleware";

/**
 * For handlers that serve signed-out visitors too: the same context as
 * requireSupabaseAuth when someone is signed in, otherwise null.
 */
export async function optionalAuthContext(): Promise<AuthContext | null> {
  const request = getRequest();
  if (!request) return null;
  const user = await currentUser(request).catch(() => null);
  if (!user) return null;
  return {
    supabase: createDbClient("authenticated", { id: user.id, email: user.email }),
    userId: user.id,
    claims: { sub: user.id, email: user.email, name: user.name },
  };
}
