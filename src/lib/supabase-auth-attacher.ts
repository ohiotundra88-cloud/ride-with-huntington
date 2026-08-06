import { createMiddleware } from "@tanstack/react-start";
import { supabaseBrowser } from "@/integrations/supabase/proxy-client";

// Same behaviour as the generated attachSupabaseAuth, but reads the session
// from the same-origin proxied client so all browser traffic stays on this
// domain (corporate VPN filters block the backend host).
export const attachSupabaseAuthSameOrigin = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      token = data.session?.access_token;
    } catch {
      token = undefined;
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
