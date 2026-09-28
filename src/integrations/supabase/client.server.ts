// Server-side database client acting as the trusted service role (bypasses
// row-level security). Use only in server functions and server routes, and
// only after checking the caller's permissions.
// Load inside handlers: const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
import { accountAdmin, createDbClient, storage, type Db } from "@/server/backend.server";

type AdminClient = Db & {
  auth: { admin: ReturnType<typeof accountAdmin> };
  storage: typeof storage;
};

let client: Db | undefined;

function service(): Db {
  if (!client) client = createDbClient("service_role");
  return client;
}

export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_target, prop) {
    if (prop === "storage") return storage;
    if (prop === "auth") return { admin: accountAdmin(service()) };
    const value = Reflect.get(service(), prop);
    return typeof value === "function" ? value.bind(service()) : value;
  },
});
