import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Browser database client. Requests go to this site's own origin
// (/api/public/sb/rest/v1/*), where the server attaches the signed-in
// person's identity from their session cookie. The browser never holds a
// database credential, and corporate VPN filters only ever see this domain.

function createBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("supabaseBrowser is browser-only; use a server function during SSR.");
  }
  return createClient<Database>(`${window.location.origin}/api/public/sb`, "hub", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let cached: ReturnType<typeof createBrowserClient> | undefined;

export const supabaseBrowser = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_t, prop, receiver) {
    if (!cached) cached = createBrowserClient();
    return Reflect.get(cached, prop, receiver);
  },
});
