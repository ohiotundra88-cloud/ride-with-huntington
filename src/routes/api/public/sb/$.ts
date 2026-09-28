import { createFileRoute } from "@tanstack/react-router";

// Same-origin passthrough from the browser to the database API (PostgREST).
//
// Corporate VPNs / web filters often block unfamiliar hostnames while allowing
// the site's own domain, so the browser only ever talks to this origin.
//
// Security: the browser holds no database credential. This route looks up the
// signed-in person from their session cookie and signs a short-lived token for
// them (or an anonymous one), so row-level security decides what they see.
// Only the data API is exposed; nothing the browser sends can raise its role.

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

// Never forwarded from the browser: credentials and client-claimed addresses.
const STRIPPED = new Set([
  "authorization",
  "apikey",
  "cookie",
  "x-forwarded-for",
  "x-real-ip",
  "forwarded",
  "x-client-ip",
  "cf-access-client-id",
  "cf-access-client-secret",
]);

async function proxy({ request, params }: { request: Request; params: Record<string, string | undefined> }) {
  const splat = (params["_splat"] ?? "").replace(/^\/+/, "");
  if (!splat.startsWith("rest/v1/")) return new Response("Not found", { status: 404 });

  const { currentUser } = await import("@/server/session.server");
  const { databaseToken, databaseGatewayHeaders, databaseUrl } = await import("@/server/backend.server");

  const user = await currentUser(request).catch(() => null);
  const token = user
    ? await databaseToken("authenticated", { id: user.id, email: user.email })
    : await databaseToken("anon");

  const incoming = new URL(request.url);
  const target = `${databaseUrl()}/${splat}${incoming.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP.has(k) && !STRIPPED.has(k)) headers.set(key, value);
  });
  headers.set("authorization", `Bearer ${token}`);
  headers.set("accept-encoding", "identity");
  for (const [k, v] of Object.entries(databaseGatewayHeaders())) headers.set(k, v);

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, { method, headers, body, redirect: "manual" });
  } catch {
    return Response.json({ message: "Backend unreachable" }, { status: 502 });
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") outHeaders.set(key, value);
  });
  outHeaders.set("cache-control", "no-store");
  outHeaders.set("x-content-type-options", "nosniff");

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: outHeaders });
}

export const Route = createFileRoute("/api/public/sb/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
      OPTIONS: proxy,
      HEAD: proxy,
    },
  },
});
