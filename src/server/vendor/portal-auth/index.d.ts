import { type PortalSessionStore } from "./store.js";
import { type MachineAuthConfig } from "./machine.js";
export {
  createMachineTokenSource,
  isMachineDeniedPermission,
  machineAudience,
  MACHINE_TOKEN_USE,
  MACHINE_TOKEN_MAX_TTL_SECONDS,
  DEFAULT_MACHINE_API_PREFIX,
  type MachineAuditEvent,
  type MachineAuthConfig,
} from "./machine.js";
export {
  createD1SessionStore,
  createMemorySessionStore,
  PORTAL_SESSIONS_MIGRATION,
  type PortalSessionStore,
  type StoredPortalSession,
  type SessionPatch,
  type D1Like,
} from "./store.js";
export { TokenError, verifyIdToken, decodeJwt } from "./jwt.js";
export type { Jwks, Jwk, JwtClaims, VerifyOptions } from "./jwt.js";
export interface OrgMembership {
  slug: string;
  name?: string;
  roles: string[];
  permissions: string[];
}
export interface PortalSession {
  /** "machine" for a machine client (getApiPrincipal); a person otherwise. */
  kind?: "user" | "machine";
  sub: string;
  email: string;
  name: string;
  org: string;
  roles: string[];
  permissions: string[];
  /** epoch seconds */
  exp: number;
}
export interface PortalAuthConfig {
  /** Auth host origin, e.g. https://auth.studio.madebyaspire.com */
  authBaseUrl: string;
  clientId: string;
  clientSecret: string;
  /** This portal's origin, e.g. https://modern-maid-portal.studio.madebyaspire.com */
  portalOrigin: string;
  /** The organization this portal serves. Tokens without it are refused. */
  orgSlug: string;
  /**
   * Default "aspire_portal". On https the name always gets the "__Host-"
   * prefix (added if missing): Secure, Path=/, no Domain, so a sibling
   * subdomain cannot plant or overwrite it.
   */
  cookieName?: string;
  /** At least 32 random characters. Signs the portal session cookie. */
  sessionSecret: string;
  callbackPath?: string;
  postLogoutPath?: string;
  scope?: string;
  /**
   * Portal session lifetime. Stateless mode (no store): default 3600, and the
   * session cannot be revoked before it ends. Store mode: default 28800 (8h),
   * revocable, membership re-checked every refreshAfterSeconds.
   */
  sessionTtlSeconds?: number;
  /**
   * Server-side session records (recommended). With a store, the cookie holds
   * only a signed session id, logout revokes the record, and membership is
   * re-checked against the auth host. See createD1SessionStore and
   * PORTAL_SESSIONS_MIGRATION.
   */
  store?: PortalSessionStore;
  /** Store mode: re-check membership after this many seconds. Default 600. */
  refreshAfterSeconds?: number;
  /**
   * Store mode: if the auth host cannot be reached, keep honouring a session
   * for at most this long after its last successful re-check. Default 1800.
   */
  maxStaleSeconds?: number;
  jwksCacheSeconds?: number;
  /**
   * Accept Aspire Identity machine tokens (Authorization: Bearer) on API
   * routes. Off unless set. See getApiPrincipal and README "Machine clients".
   */
  machine?: MachineAuthConfig;
  /** Tell the auth host about membership denials so they land in its audit log. Default true. */
  reportDenials?: boolean;
  fetch?: typeof fetch;
  /** Test hook: current time in epoch seconds. */
  now?: () => number;
}
export declare class PortalAuthError extends Error {
  status: 400 | 401 | 403 | 502;
  code: string;
  constructor(status: 400 | 401 | 403 | 502, code: string, message?: string);
  toResponse(): Response;
}
/**
 * Portal people management (Aspire Identity POST /api/portal/members,
 * ARCHITECTURE 5a). Identity re-checks the acting person on every call.
 */
export interface PortalPerson {
  /** Opaque: "m_..." (has signed in) or "p_..." (invited, not signed in yet). */
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: "active" | "invited";
  added_at: string | null;
  added_by: string | null;
  you: boolean;
  /** Why this row can not be changed here: yourself, the owner, or more access than you have. */
  locked: "you" | "owner" | "above" | null;
}
export interface PortalPeopleList {
  org: {
    slug: string;
    name: string;
  };
  you: {
    roles: string[];
    super_admin: boolean;
  };
  people: PortalPerson[];
}
export interface PortalPersonInput {
  name: string;
  email: string;
  roles: string[];
}
export type PortalMembersResult =
  | {
      result: "added" | "invited";
      person: PortalPerson;
    }
  | {
      result: "already";
      message: string;
    }
  | {
      result: "updated";
      user_id: string | null;
      person: PortalPerson;
    }
  | {
      result: "removed";
      user_id: string | null;
      person: PortalPerson;
    };
/** A refusal from Identity's membership API, with its plain-English message. */
export declare class PortalMembersError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string);
}
/** A machine client acting on this portal's API. Works with requirePermission like a person's session. */
export interface MachinePrincipal extends PortalSession {
  kind: "machine";
  clientId: string;
  jti: string;
}
export declare function safeOAuthError(code: unknown): string;
/** Clear module caches (tests). */
export declare function _resetCaches(): void;
export declare function hasPermission(
  session: PortalSession | null | undefined,
  permission: string,
): boolean;
/** Throws PortalAuthError(401) with no session, (403) without the permission. */
export declare function requirePermission(
  session: PortalSession | null | undefined,
  permission: string,
): PortalSession;
export declare function createPortalAuth(cfg: PortalAuthConfig): {
  config: {
    issuer: string;
    redirectUri: string;
    cookieName: string;
    orgSlug: string;
    storeMode: boolean;
    refreshAfterSeconds: number;
    machineTokens: boolean;
  };
  /** Start login: 302 to the auth host with PKCE, state and nonce. */
  login(
    request: Request,
    opts?: {
      returnTo?: string;
    },
  ): Promise<Response>;
  /**
   * Finish login at the redirect URI. Returns a 302 into the portal with the
   * session cookie, or a 400/401/403 Response with NO session cookie.
   */
  callback(request: Request): Promise<Response>;
  /**
   * The verified portal session, or null.
   * Store mode: loads the server-side record; revoked, expired or foreign
   * records are null; after refreshAfterSeconds the membership is re-checked
   * against the auth host and a removed member (or deleted user) is revoked.
   */
  getSession(request: Request): Promise<PortalSession | null>;
  authenticateMachine: (request: Request) => Promise<MachinePrincipal | null>;
  /**
   * For API routes: a machine client (Authorization: Bearer) or a signed-in
   * person (session cookie). A request with a bearer token is judged on the
   * token alone and never falls back to the cookie. Pages should keep using
   * getSession, which never reads the Authorization header.
   */
  getApiPrincipal(request: Request): Promise<PortalSession | null>;
  /**
   * People who can sign in to this portal, through Aspire Identity (store
   * mode). Identity re-checks the signed-in person's members:manage on every
   * call, scopes it to this portal's org, and hides platform super admins.
   */
  members: {
    list: (request: Request) => Promise<PortalPeopleList>;
    add: (request: Request, person: PortalPersonInput) => Promise<PortalMembersResult>;
    update: (request: Request, id: string, roles: string[]) => Promise<PortalMembersResult>;
    remove: (request: Request, id: string) => Promise<PortalMembersResult>;
  };
  /** Store mode: revoke one session by id (e.g. from an admin screen). */
  revokeSession(id: string): Promise<void>;
  requirePermission: typeof requirePermission;
  hasPermission: typeof hasPermission;
  /** Clear the portal cookie, revoke the server-side session (store mode), and end the auth host session. */
  logout(request: Request): Promise<Response>;
};
export type PortalAuth = ReturnType<typeof createPortalAuth>;
