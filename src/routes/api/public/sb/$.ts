import { createFileRoute } from "@tanstack/react-router";

// Same-origin passthrough to the backend API.
//
// Corporate VPNs / web filters frequently block the backend's own hostname
// while allowing the site domain. Routing browser traffic through this route
// means the page only ever talks to its own origin.
//
// Security: this proxy adds NO credentials. It forwards the caller's own
// Authorization/apikey headers, so row-level security still applies exactly as
// it would for a direct call. No service-role key is ever involved.

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

function upstreamBase(): string {
  const base =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error("Backend URL is not configured");
  return String(base).replace(/\/+$/, "");
}

// Only proxy the Supabase HTTP surfaces the browser client uses. Storage,
// functions and realtime are server-side only; proxying storage would serve
// uploaded files from this origin with their stored content type.
const ALLOWED_PREFIXES = ["auth/", "rest/"];

// Client-supplied forwarding headers are never trusted.
const SPOOFABLE = new Set(["x-forwarded-for", "x-real-ip", "forwarded", "x-client-ip"]);

async function proxy({ request, params }: { request: Request; params: Record<string, string | undefined> }) {
  const splat = (params["_splat"] ?? "").replace(/^\/+/, "");
  if (!ALLOWED_PREFIXES.some((p) => splat.startsWith(p))) {
    return new Response("Not found", { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = `${upstreamBase()}/${splat}${incoming.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP.has(k) && !SPOOFABLE.has(k)) headers.set(key, value);
  });
  headers.set("accept-encoding", "identity");
  // Pass the real client IP (set by Cloudflare, not the browser) so Supabase's
  // per-IP auth rate limits apply per colleague rather than to this proxy.
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
    });
  } catch {
    return new Response(JSON.stringify({ message: "Backend unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders.set(key, value);
  });
  outHeaders.set("cache-control", "no-store");
  outHeaders.set("x-content-type-options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
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
