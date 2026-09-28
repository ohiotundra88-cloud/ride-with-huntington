/**
 * Headers for serving user-uploaded files from the app's own domain.
 *
 * Uploaded files are served same-origin (VPN friendly), so a file that a
 * browser renders as a web page could run script as ridewithhuntington.com.
 * Only known image/PDF types render inline; everything else downloads, and
 * every response is locked down with nosniff + a sandboxing CSP.
 */
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

/** Best guess from a storage path's extension, restricted to safe types. */
export function typeFromPath(path: string | null | undefined): string | null {
  const ext = (path ?? "").split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? null;
}

export function safeFileHeaders(opts: {
  contentType?: string | null;
  fileName?: string | null;
  cacheSeconds?: number;
}): Record<string, string> {
  const requested = (opts.contentType ?? "").split(";")[0].trim().toLowerCase();
  const inline = INLINE_TYPES.has(requested);
  const type = inline ? requested : "application/octet-stream";
  const name = (opts.fileName ?? "file").replace(/["\r\n\\]/g, "").slice(0, 150) || "file";
  return {
    "Content-Type": type,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": `public, max-age=${opts.cacheSeconds ?? 300}`,
  };
}
