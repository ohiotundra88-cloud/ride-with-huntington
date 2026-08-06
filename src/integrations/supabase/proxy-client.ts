import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabase as generatedSupabase } from "./client";

// Browser client that talks to the backend through this site's own origin
// (/api/public/sb/*) instead of the backend hostname directly. Corporate
// VPN filters commonly block the backend host while allowing the site domain.
//
// Server-side callers fall back to the generated client (direct connection).

const DIRECT_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function projectRef(): string {
  try {
    return new URL(DIRECT_URL ?? "").hostname.split(".")[0] ?? "app";
  } catch {
    return "app";
  }
}

function isNewApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function proxyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    // New-style keys are opaque strings, not bearer JWTs.
    if (isNewApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function createProxyClient() {
  if (!PUBLISHABLE_KEY) throw new Error("Missing backend publishable key");
  const url = `${window.location.origin}/api/public/sb`;
  return createClient<Database>(url, PUBLISHABLE_KEY, {
    global: { fetch: proxyFetch(PUBLISHABLE_KEY) },
    auth: {
      // Keep the same storage key the generated client uses so existing
      // sessions survive the switch to the proxied URL.
      storageKey: `sb-${projectRef()}-auth-token`,
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let cached: ReturnType<typeof createProxyClient> | undefined;

/** Same-origin browser client; falls back to the direct client during SSR. */
export const supabaseBrowser = new Proxy({} as ReturnType<typeof createProxyClient>, {
  get(_t, prop, receiver) {
    if (typeof window === "undefined") {
      return Reflect.get(generatedSupabase as never, prop, receiver);
    }
    if (!cached) cached = createProxyClient();
    return Reflect.get(cached, prop, receiver);
  },
});

/** Absolute URL of the same-origin backend passthrough (browser only). */
export function proxyBaseUrl() {
  return typeof window === "undefined" ? "" : `${window.location.origin}/api/public/sb`;
}
