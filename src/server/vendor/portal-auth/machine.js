/**
 * Machine tokens (Aspire Identity machine clients, OPS-230 decision 3).
 *
 * Shared constants for both sides, the portal-side claim checks, and a small
 * token source for the caller (Aria's scripts and crons). The verifying code
 * that needs the JWKS lives in createPortalAuth (index.ts).
 */
/** The only `token_use` a portal accepts on a bearer token. */
export const MACHINE_TOKEN_USE = "machine";
/** A machine token may never claim a longer life than this (decision 3: at most 15 minutes). */
export const MACHINE_TOKEN_MAX_TTL_SECONDS = 900;
/**
 * Permissions a machine token may never carry (security review H1): money
 * out, settings, HR, applicants and membership. The auth host never issues
 * them; a portal refuses a token that carries any of them (403
 * machine-token-overreach).
 */
export function isMachineDeniedPermission(permission) {
  return (
    permission === "sales:refund" || /^(settings|applicants|hr_notes|members):/.test(permission)
  );
}
/** Default: machine bearer tokens are accepted only under this path prefix. */
export const DEFAULT_MACHINE_API_PREFIX = "/api/";
/** Audience of a machine token for one organization. The auth host signs the same string. */
export function machineAudience(orgSlug) {
  return `urn:aspire:machine:${orgSlug}`;
}
/**
 * Client side: fetch and cache a machine token. Asks the auth host's token
 * endpoint with client_secret_basic and refreshes 30 seconds before expiry.
 * For servers and scripts only. Never ship a machine secret to a browser.
 */
export function createMachineTokenSource(cfg) {
  const doFetch = cfg.fetch ?? fetch;
  const now = () => cfg.now?.() ?? Math.floor(Date.now() / 1000);
  const endpoint = `${cfg.authBaseUrl.replace(/\/+$/, "")}/api/auth/oauth2/token`;
  let cached = null;
  async function getToken() {
    if (cached && cached.exp - 30 > now()) return cached.token;
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    if (cfg.org) body.set("org", cfg.org);
    const res = await doFetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        authorization: `Basic ${btoa(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`)}`,
      },
      body: body.toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token)
      throw new Error(`machine token request failed: ${res.status} ${json.error ?? ""}`.trim());
    cached = {
      token: json.access_token,
      exp: now() + Math.min(Number(json.expires_in) || 60, MACHINE_TOKEN_MAX_TTL_SECONDS),
    };
    return cached.token;
  }
  return {
    getToken,
    /** Headers for a portal API call. */
    async headers(extra = {}) {
      return { ...extra, authorization: `Bearer ${await getToken()}` };
    },
    /** Forget the cached token (for example after the client was rotated). */
    clear() {
      cached = null;
    },
  };
}
