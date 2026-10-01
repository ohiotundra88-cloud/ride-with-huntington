import { setting } from "./runtime.ts";

/**
 * One public address. Any other host that reaches this Worker (the bare
 * domain, an old preview hostname) is sent to PUBLIC_ORIGIN with the same
 * path, so sign-in cookies and links always belong to one origin.
 *
 * Nitro's Workers entry calls the server entry with the request only, so
 * `env` is usually undefined here; PUBLIC_ORIGIN then comes from setting(),
 * which reads the Worker vars Nitro keeps on globalThis (or process.env).
 */
export function canonicalRedirect(request: Request, env?: unknown): Response | null {
  const fromEnv = (env as { PUBLIC_ORIGIN?: unknown } | null | undefined)?.PUBLIC_ORIGIN;
  const origin =
    typeof fromEnv === "string" && fromEnv ? fromEnv : setting("PUBLIC_ORIGIN", { optional: true });
  if (!origin) return null;
  const url = new URL(request.url);
  const canonical = new URL(origin);
  if (url.host === canonical.host || url.hostname === "localhost") return null;
  const target = new URL(url.pathname + url.search, canonical);
  const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
  return Response.redirect(target.toString(), status);
}
