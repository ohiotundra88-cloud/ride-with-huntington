/**
 * @aspire/portal-auth
 *
 * The portal half of Aspire Identity (ARCHITECTURE section 7). A portal on its own
 * domain delegates login to the auth host with OAuth 2.1 authorization code +
 * PKCE, verifies the returned ID token against the auth host's JWKS, requires
 * a membership in its own organization, and then keeps its own short-lived,
 * HMAC-signed, host-only session cookie. Zero runtime dependencies.
 */
import { clearCookie, readCookie, serializeCookie, sign, unsign } from "./cookies.js";
import { b64url, randomB64url, timingSafeEqual, utf8 } from "./encoding.js";
import { TokenError, verifyIdToken } from "./jwt.js";
import { openToken, sealToken } from "./store.js";
import {
  DEFAULT_MACHINE_API_PREFIX,
  MACHINE_TOKEN_MAX_TTL_SECONDS,
  MACHINE_TOKEN_USE,
  isMachineDeniedPermission,
  machineAudience,
} from "./machine.js";
export {
  createMachineTokenSource,
  isMachineDeniedPermission,
  machineAudience,
  MACHINE_TOKEN_USE,
  MACHINE_TOKEN_MAX_TTL_SECONDS,
  DEFAULT_MACHINE_API_PREFIX,
} from "./machine.js";
export {
  createD1SessionStore,
  createMemorySessionStore,
  PORTAL_SESSIONS_MIGRATION,
} from "./store.js";
export { TokenError, verifyIdToken, decodeJwt } from "./jwt.js";
export class PortalAuthError extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.name = "PortalAuthError";
  }
  toResponse() {
    return new Response(
      `${this.status} ${this.code}${this.message && this.message !== this.code ? `: ${this.message}` : ""}\n`,
      {
        status: this.status,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      },
    );
  }
}
/** A refusal from Identity's membership API, with its plain-English message. */
export class PortalMembersError extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "PortalMembersError";
  }
}
const TX_TTL = 600;
/**
 * OAuth / OIDC error codes we are willing to repeat in a response body
 * (RFC 6749 4.1.2.1, 5.2; OIDC Core 3.1.2.6). Anything else from the query
 * string or the token endpoint is reported as "authorization_error", so a
 * crafted callback URL cannot put arbitrary text on the portal's page.
 */
const KNOWN_OAUTH_ERRORS = new Set([
  "invalid_request",
  "unauthorized_client",
  "access_denied",
  "unsupported_response_type",
  "invalid_scope",
  "server_error",
  "temporarily_unavailable",
  "invalid_client",
  "invalid_grant",
  "unsupported_grant_type",
  "interaction_required",
  "login_required",
  "account_selection_required",
  "consent_required",
  "invalid_request_uri",
  "invalid_request_object",
  "request_not_supported",
  "request_uri_not_supported",
  "registration_not_supported",
]);
export function safeOAuthError(code) {
  return typeof code === "string" && KNOWN_OAUTH_ERRORS.has(code) ? code : "authorization_error";
}
const discoveryCache = new Map();
const jwksCache = new Map();
/** Last forced JWKS refresh per JWKS URL, for the machine-token path. */
const forcedJwksAt = new Map();
/** Clear module caches (tests). */
export function _resetCaches() {
  discoveryCache.clear();
  jwksCache.clear();
  forcedJwksAt.clear();
}
function safeReturnTo(v) {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return "/";
  return v;
}
export function hasPermission(session, permission) {
  return !!session && session.permissions.includes(permission);
}
/** Throws PortalAuthError(401) with no session, (403) without the permission. */
export function requirePermission(session, permission) {
  if (!session) throw new PortalAuthError(401, "not-signed-in");
  if (!session.permissions.includes(permission))
    throw new PortalAuthError(403, "forbidden", `missing ${permission}`);
  return session;
}
export function createPortalAuth(cfg) {
  if (!cfg.sessionSecret || cfg.sessionSecret.length < 32)
    throw new Error("portal-auth: sessionSecret must be at least 32 characters");
  const authBase = cfg.authBaseUrl.replace(/\/+$/, "");
  const portalOrigin = cfg.portalOrigin.replace(/\/+$/, "");
  const issuer = `${authBase}/api/auth`;
  const secure = portalOrigin.startsWith("https://");
  const baseCookieName = (cfg.cookieName ?? "aspire_portal").replace(/^__(Host|Secure)-/, "");
  const cookieName = secure ? `__Host-${baseCookieName}` : baseCookieName;
  const store = cfg.store;
  const txCookie = `${cookieName}_tx`;
  const callbackPath = cfg.callbackPath ?? "/auth/callback";
  const redirectUri = `${portalOrigin}${callbackPath}`;
  const baseScope = cfg.scope ?? "openid profile email org";
  // Store mode re-checks membership with a refresh token, so it asks for offline_access.
  const scope =
    store && !baseScope.split(" ").includes("offline_access")
      ? `${baseScope} offline_access`
      : baseScope;
  const ttl = cfg.sessionTtlSeconds ?? (store ? 8 * 3600 : 3600);
  const refreshAfter = cfg.refreshAfterSeconds ?? 600;
  const maxStale = cfg.maxStaleSeconds ?? 1800;
  const basicAuth = () =>
    `Basic ${btoa(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`)}`;
  const jwksTtl = (cfg.jwksCacheSeconds ?? 600) * 1000;
  const doFetch = cfg.fetch ?? fetch;
  const now = () => cfg.now?.() ?? Math.floor(Date.now() / 1000);
  async function discovery() {
    const hit = discoveryCache.get(issuer);
    if (hit && Date.now() - hit.at < jwksTtl) return hit.doc;
    let doc;
    try {
      const res = await doFetch(`${issuer}/.well-known/openid-configuration`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(String(res.status));
      doc = await res.json();
      if (doc.issuer !== issuer) throw new Error(`issuer mismatch ${doc.issuer}`);
    } catch {
      // Fall back to Better-Auth's fixed paths if discovery is unreachable.
      doc = {
        issuer,
        authorization_endpoint: `${issuer}/oauth2/authorize`,
        token_endpoint: `${issuer}/oauth2/token`,
        jwks_uri: `${issuer}/jwks`,
        end_session_endpoint: `${issuer}/oauth2/end-session`,
        userinfo_endpoint: `${issuer}/oauth2/userinfo`,
        revocation_endpoint: `${issuer}/oauth2/revoke`,
      };
    }
    discoveryCache.set(issuer, { at: Date.now(), doc });
    return doc;
  }
  async function getJwks(refresh) {
    const { jwks_uri } = await discovery();
    const hit = jwksCache.get(jwks_uri);
    // refresh=true means the token's kid is not in the cached set (key
    // rotation): always refetch once. Only ID tokens that came back from our
    // own code exchange with the auth host reach this point, so a caller
    // cannot force refetches with made-up kids.
    if (hit && !refresh && Date.now() - hit.at < jwksTtl) return hit.jwks;
    const res = await doFetch(jwks_uri, { headers: { accept: "application/json" } });
    if (!res.ok) throw new PortalAuthError(502, "jwks-unavailable");
    const jwks = await res.json();
    jwksCache.set(jwks_uri, { at: Date.now(), jwks });
    return jwks;
  }
  // Bearer tokens come from any caller, so an unknown kid must not let a
  // caller force a JWKS fetch on every request: at most one forced refresh
  // per minute on the machine path.
  // Module level, keyed by JWKS URL, because a portal may build this helper per request.
  async function getJwksThrottled(refresh) {
    if (refresh) {
      const { jwks_uri } = await discovery();
      if (Date.now() - (forcedJwksAt.get(jwks_uri) ?? 0) < 60_000) return getJwks(false);
      forcedJwksAt.set(jwks_uri, Date.now());
    }
    return getJwks(refresh);
  }
  /**
   * Verify an Authorization: Bearer machine token. Returns null when the
   * request has no bearer token. Throws PortalAuthError when it has one that
   * is not good here. Every outcome is passed to cfg.machine.audit. Never
   * returns a Response and never sets a cookie.
   */
  async function authenticateMachine(request) {
    const header = request.headers.get("authorization");
    if (!header || !/^bearer\s/i.test(header)) return null;
    const url = new URL(request.url);
    const base = { at: now(), org: cfg.orgSlug, method: request.method, path: url.pathname };
    const machine = cfg.machine;
    if (!machine) throw new PortalAuthError(401, "machine-tokens-disabled");
    let clientId = null;
    let jti = null;
    const refuse = async (status, reason) => {
      await machine.audit({ event: "machine.denied", ...base, clientId, jti, reason, status });
      throw new PortalAuthError(status, reason);
    };
    // Always a whole path segment: "/api" means "/api/", so "/apiary" is refused.
    const rawPrefix = machine.apiPathPrefix ?? DEFAULT_MACHINE_API_PREFIX;
    const prefix = rawPrefix.endsWith("/") ? rawPrefix : `${rawPrefix}/`;
    if (!url.pathname.startsWith(prefix)) return refuse(403, "machine-token-api-only");
    // A browser navigation never carries a machine token legitimately.
    if ((request.headers.get("sec-fetch-mode") ?? "").toLowerCase() === "navigate")
      return refuse(403, "machine-token-api-only");
    const token = header.replace(/^bearer\s+/i, "").trim();
    let claims;
    try {
      claims = await verifyIdToken(token, {
        issuer,
        audience: machineAudience(cfg.orgSlug),
        now: now(),
        getJwks: getJwksThrottled,
      });
    } catch (e) {
      if (e instanceof PortalAuthError) throw e;
      const code = e instanceof TokenError ? e.code : "verify-failed";
      // A good token for another organization: say so (403), otherwise 401.
      return refuse(
        code === "wrong_audience" ? 403 : 401,
        code === "wrong_audience" ? "wrong-org" : `invalid-token:${code}`,
      );
    }
    clientId = typeof claims.client_id === "string" ? claims.client_id : null;
    jti = typeof claims.jti === "string" ? claims.jti : null;
    if (
      claims.token_use !== MACHINE_TOKEN_USE ||
      !clientId ||
      !jti ||
      claims.sub !== `machine:${clientId}`
    ) {
      return refuse(401, "not-a-machine-token");
    }
    if (claims.org !== cfg.orgSlug) return refuse(403, "wrong-org");
    if (
      typeof claims.iat !== "number" ||
      typeof claims.exp !== "number" ||
      claims.exp - claims.iat > MACHINE_TOKEN_MAX_TTL_SECONDS
    ) {
      return refuse(401, "token-lifetime-too-long");
    }
    const orgs = Array.isArray(claims.orgs) ? claims.orgs : [];
    const membership =
      orgs.length === 1 ? orgs.find((o) => o && o.slug === cfg.orgSlug) : undefined;
    if (!membership) return refuse(403, "wrong-org");
    const permissions = Array.isArray(membership.permissions)
      ? membership.permissions.map(String)
      : [];
    // A machine token never carries money out, settings, HR, applicants or
    // membership (security review H1). One that does is refused outright, not trimmed.
    if (permissions.some(isMachineDeniedPermission)) return refuse(403, "machine-token-overreach");
    const principal = {
      kind: "machine",
      sub: String(claims.sub),
      email: "",
      name: clientId,
      org: cfg.orgSlug,
      roles: Array.isArray(membership.roles) ? membership.roles.map(String) : [],
      permissions,
      exp: claims.exp,
      clientId,
      jti,
    };
    await machine.audit({ event: "machine.used", ...base, clientId, jti });
    return principal;
  }
  async function reportDenial(idToken, reason) {
    if (cfg.reportDenials === false) return;
    try {
      await doFetch(`${authBase}/api/portal/audit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "portal.denied",
          id_token: idToken,
          org_slug: cfg.orgSlug,
          reason,
        }),
      });
    } catch {
      /* the 403 stands even if the report fails */
    }
  }
  function headersWith(cookies, extra = {}) {
    const h = new Headers({ "cache-control": "no-store", ...extra });
    for (const c of cookies) h.append("set-cookie", c);
    return h;
  }
  function toSession(r) {
    return {
      sub: r.sub,
      email: r.email,
      name: r.name,
      org: r.org,
      roles: r.roles,
      permissions: r.permissions,
      exp: r.expiresAt,
    };
  }
  async function revokeRefreshToken(token) {
    try {
      const d = await discovery();
      await doFetch(d.revocation_endpoint ?? `${issuer}/oauth2/revoke`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: basicAuth(),
        },
        body: new URLSearchParams({ token, token_type_hint: "refresh_token" }).toString(),
      });
    } catch {
      /* best effort; the portal session is already revoked */
    }
  }
  /**
   * Membership re-check (store mode). Claims the check first so parallel
   * requests never spend the same rotating refresh token twice. Returns the
   * updated record, the unchanged record (another request is checking, or the
   * auth host is briefly unreachable), or null after revoking.
   */
  async function recheck(rec) {
    const t = now();
    const claimed = await store.touch(rec.id, { checkedAt: t }, rec.checkedAt);
    if (!claimed) {
      const current = await store.get(rec.id);
      return current && current.revokedAt === null && current.expiresAt > t ? current : null;
    }
    const revoke = async () => {
      await store.revoke(rec.id);
      return null;
    };
    const transient = async () =>
      t - rec.verifiedAt > maxStale ? revoke() : { ...rec, checkedAt: t };
    const refreshToken = rec.refreshToken
      ? await openToken(cfg.sessionSecret, rec.refreshToken, rec.id)
      : null;
    if (!refreshToken) return revoke(); // no way to re-check: end it (re-login is silent while the auth host session lives)
    let d;
    let tokenRes;
    try {
      d = await discovery();
      tokenRes = await doFetch(d.token_endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          authorization: basicAuth(),
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });
    } catch {
      return transient();
    }
    if (tokenRes.status >= 500) return transient();
    const tokens = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokens.access_token) return revoke(); // invalid_grant: user deleted, token revoked, session ended
    let info;
    try {
      const res = await doFetch(d.userinfo_endpoint ?? `${issuer}/oauth2/userinfo`, {
        headers: { authorization: `Bearer ${tokens.access_token}`, accept: "application/json" },
      });
      if (res.status >= 500) return transient();
      if (!res.ok) return revoke();
      info = await res.json();
    } catch {
      return transient();
    }
    if (String(info.sub) !== rec.sub) return revoke();
    const membership = Array.isArray(info.orgs)
      ? info.orgs.find((o) => o && o.slug === cfg.orgSlug)
      : undefined;
    if (!membership) return revoke(); // membership removed
    const patch = {
      email: typeof info.email === "string" ? info.email : rec.email,
      name: typeof info.name === "string" ? info.name : rec.name,
      roles: Array.isArray(membership.roles) ? membership.roles.map(String) : [],
      permissions: Array.isArray(membership.permissions) ? membership.permissions.map(String) : [],
      verifiedAt: t,
      refreshToken: tokens.refresh_token
        ? await sealToken(cfg.sessionSecret, tokens.refresh_token, rec.id)
        : rec.refreshToken,
    };
    await store.touch(rec.id, patch);
    return { ...rec, ...patch, checkedAt: t };
  }
  /**
   * The signed-in person's refresh token for this client (store mode only).
   * It is the person's proof to Identity's membership API; Identity checks it
   * with /oauth2/introspect, which neither spends nor rotates it.
   */
  async function actorToken(request) {
    if (!store) return null;
    const ref = await unsign(readCookie(request, cookieName), cfg.sessionSecret, "session-ref");
    if (!ref || typeof ref.sid !== "string" || ref.exp <= now()) return null;
    const rec = await store.get(ref.sid);
    if (
      !rec ||
      rec.revokedAt !== null ||
      rec.expiresAt <= now() ||
      rec.org !== cfg.orgSlug ||
      !rec.refreshToken
    )
      return null;
    return openToken(cfg.sessionSecret, rec.refreshToken, rec.id);
  }
  async function membersCall(request, payload) {
    // Two tries: a membership re-check may rotate the refresh token between
    // reading it and Identity checking it.
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await actorToken(request);
      if (!token)
        throw new PortalMembersError(
          401,
          "not-signed-in",
          store ? "Please sign in again." : "People management needs portal-auth store mode.",
        );
      let res;
      try {
        res = await doFetch(`${authBase}/api/portal/members`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: basicAuth(),
          },
          body: JSON.stringify({ ...payload, org: cfg.orgSlug, actor_token: token }),
        });
      } catch {
        throw new PortalMembersError(
          502,
          "identity-unreachable",
          "Sign-in service is not answering. Please try again in a minute.",
        );
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 && body.error === "actor_inactive" && attempt === 0) continue;
      if (!res.ok)
        throw new PortalMembersError(
          res.status,
          String(body.error ?? "error"),
          String(body.message ?? "Something went wrong. Please try again."),
        );
      return body;
    }
    throw new PortalMembersError(
      401,
      "actor_inactive",
      "Your sign-in has ended. Please sign in again.",
    );
  }
  const api = {
    config: {
      issuer,
      redirectUri,
      cookieName,
      orgSlug: cfg.orgSlug,
      storeMode: !!store,
      refreshAfterSeconds: refreshAfter,
      machineTokens: !!cfg.machine,
    },
    /** Start login: 302 to the auth host with PKCE, state and nonce. */
    async login(request, opts = {}) {
      const url = new URL(request.url);
      const d = await discovery();
      const verifier = randomB64url(32);
      const challenge = b64url(await crypto.subtle.digest("SHA-256", utf8(verifier)));
      const tx = {
        state: randomB64url(24),
        nonce: randomB64url(24),
        verifier,
        returnTo: safeReturnTo(opts.returnTo ?? url.searchParams.get("returnTo")),
        exp: now() + TX_TTL,
      };
      const authz = new URL(d.authorization_endpoint);
      authz.search = new URLSearchParams({
        response_type: "code",
        client_id: cfg.clientId,
        redirect_uri: redirectUri,
        scope,
        state: tx.state,
        nonce: tx.nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();
      const signed = await sign(tx, cfg.sessionSecret, "tx");
      return new Response(null, {
        status: 302,
        headers: headersWith([serializeCookie(txCookie, signed, { maxAge: TX_TTL, secure })], {
          location: authz.toString(),
        }),
      });
    },
    /**
     * Finish login at the redirect URI. Returns a 302 into the portal with the
     * session cookie, or a 400/401/403 Response with NO session cookie.
     */
    async callback(request) {
      const clearTx = clearCookie(txCookie, secure);
      const fail = (e) => {
        const r = e.toResponse();
        return new Response(r.body, {
          status: r.status,
          headers: headersWith([clearTx], { "content-type": "text/plain; charset=utf-8" }),
        });
      };
      const url = new URL(request.url);
      const rawErr = url.searchParams.get("error");
      if (rawErr !== null) {
        const err = safeOAuthError(rawErr);
        return fail(new PortalAuthError(err === "access_denied" ? 403 : 400, err));
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return fail(new PortalAuthError(400, "missing-code-or-state"));
      const tx = await unsign(readCookie(request, txCookie), cfg.sessionSecret, "tx");
      if (!tx || tx.exp < now())
        return fail(new PortalAuthError(400, "login-expired", "start again"));
      if (!timingSafeEqual(tx.state, state))
        return fail(new PortalAuthError(400, "state-mismatch"));
      const iss = url.searchParams.get("iss");
      if (iss && iss !== issuer) return fail(new PortalAuthError(400, "issuer-mismatch"));
      const d = await discovery();
      let tokenRes;
      try {
        tokenRes = await doFetch(d.token_endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
            authorization: `Basic ${btoa(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`)}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            code_verifier: tx.verifier,
          }).toString(),
        });
      } catch {
        return fail(new PortalAuthError(502, "token-endpoint-unreachable"));
      }
      const body = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        // invalid_grant = code reused, expired, or PKCE mismatch.
        if (body.error === "invalid_grant" || tokenRes.status === 400)
          return fail(
            new PortalAuthError(400, body.error ? safeOAuthError(body.error) : "invalid_grant"),
          );
        if (tokenRes.status === 401)
          return fail(
            new PortalAuthError(502, "portal-client-rejected", "check client id and secret"),
          );
        return fail(new PortalAuthError(502, "token-exchange-failed"));
      }
      if (!body.id_token) return fail(new PortalAuthError(401, "no-id-token"));
      let claims;
      try {
        claims = await verifyIdToken(body.id_token, {
          issuer,
          audience: cfg.clientId,
          nonce: tx.nonce,
          now: now(),
          getJwks,
        });
      } catch (e) {
        if (e instanceof PortalAuthError) return fail(e);
        return fail(
          new PortalAuthError(
            401,
            "invalid-token",
            e instanceof TokenError ? e.code : "verify-failed",
          ),
        );
      }
      const orgs = Array.isArray(claims.orgs) ? claims.orgs : [];
      const membership = orgs.find((o) => o && o.slug === cfg.orgSlug);
      if (!membership) {
        await reportDenial(body.id_token, "not-a-member");
        return fail(new PortalAuthError(403, "not-a-member"));
      }
      const session = {
        sub: String(claims.sub),
        email: typeof claims.email === "string" ? claims.email : "",
        name: typeof claims.name === "string" ? claims.name : "",
        org: cfg.orgSlug,
        roles: Array.isArray(membership.roles) ? membership.roles.map(String) : [],
        permissions: Array.isArray(membership.permissions)
          ? membership.permissions.map(String)
          : [],
        exp: now() + ttl,
      };
      let cookie;
      if (store) {
        const id = randomB64url(32);
        const t = now();
        await store.create({
          id,
          sub: session.sub,
          email: session.email,
          name: session.name,
          org: session.org,
          roles: session.roles,
          permissions: session.permissions,
          createdAt: t,
          expiresAt: session.exp,
          checkedAt: t,
          verifiedAt: t,
          refreshToken: body.refresh_token
            ? await sealToken(cfg.sessionSecret, body.refresh_token, id)
            : null,
          revokedAt: null,
        });
        cookie = await sign({ sid: id, exp: session.exp }, cfg.sessionSecret, "session-ref");
      } else {
        cookie = await sign(session, cfg.sessionSecret, "session");
      }
      return new Response(null, {
        status: 302,
        headers: headersWith(
          [clearTx, serializeCookie(cookieName, cookie, { maxAge: ttl, secure })],
          {
            location: `${portalOrigin}${tx.returnTo}`,
          },
        ),
      });
    },
    /**
     * The verified portal session, or null.
     * Store mode: loads the server-side record; revoked, expired or foreign
     * records are null; after refreshAfterSeconds the membership is re-checked
     * against the auth host and a removed member (or deleted user) is revoked.
     */
    async getSession(request) {
      if (!store) {
        const s = await unsign(readCookie(request, cookieName), cfg.sessionSecret, "session");
        if (!s || typeof s.exp !== "number" || s.exp <= now() || s.org !== cfg.orgSlug) return null;
        return s;
      }
      const ref = await unsign(readCookie(request, cookieName), cfg.sessionSecret, "session-ref");
      if (!ref || typeof ref.sid !== "string" || ref.exp <= now()) return null;
      let rec = await store.get(ref.sid);
      if (!rec || rec.revokedAt !== null || rec.expiresAt <= now() || rec.org !== cfg.orgSlug)
        return null;
      if (now() - rec.checkedAt >= refreshAfter) {
        rec = await recheck(rec);
        if (!rec) return null;
      }
      return toSession(rec);
    },
    authenticateMachine,
    /**
     * For API routes: a machine client (Authorization: Bearer) or a signed-in
     * person (session cookie). A request with a bearer token is judged on the
     * token alone and never falls back to the cookie. Pages should keep using
     * getSession, which never reads the Authorization header.
     */
    async getApiPrincipal(request) {
      const machine = await authenticateMachine(request);
      if (machine) return machine;
      const session = await api.getSession(request);
      return session ? { ...session, kind: "user" } : null;
    },
    /**
     * People who can sign in to this portal, through Aspire Identity (store
     * mode). Identity re-checks the signed-in person's members:manage on every
     * call, scopes it to this portal's org, and hides platform super admins.
     */
    members: {
      list: (request) => membersCall(request, { action: "list" }),
      add: (request, person) => membersCall(request, { action: "add", ...person }),
      update: (request, id, roles) => membersCall(request, { action: "update", id, roles }),
      remove: (request, id) => membersCall(request, { action: "remove", id }),
    },
    /** Store mode: revoke one session by id (e.g. from an admin screen). */
    async revokeSession(id) {
      if (store) await store.revoke(id);
    },
    requirePermission,
    hasPermission,
    /** Clear the portal cookie, revoke the server-side session (store mode), and end the auth host session. */
    async logout(request) {
      if (store) {
        const ref = await unsign(readCookie(request, cookieName), cfg.sessionSecret, "session-ref");
        if (ref?.sid) {
          const rec = await store.get(ref.sid);
          await store.revoke(ref.sid);
          const rt = rec?.refreshToken
            ? await openToken(cfg.sessionSecret, rec.refreshToken, rec.id)
            : null;
          if (rt) await revokeRefreshToken(rt);
        }
      }
      const d = await discovery();
      const end = new URL(d.end_session_endpoint ?? `${issuer}/oauth2/end-session`);
      end.searchParams.set("client_id", cfg.clientId);
      end.searchParams.set(
        "post_logout_redirect_uri",
        `${portalOrigin}${cfg.postLogoutPath ?? "/"}`,
      );
      return new Response(null, {
        status: 302,
        headers: headersWith([clearCookie(cookieName, secure)], { location: end.toString() }),
      });
    },
  };
  return api;
}
