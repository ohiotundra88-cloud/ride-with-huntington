export interface StoredPortalSession {
    id: string;
    sub: string;
    email: string;
    name: string;
    org: string;
    roles: string[];
    permissions: string[];
    /** epoch seconds */
    createdAt: number;
    /** absolute end of the session, epoch seconds */
    expiresAt: number;
    /** last membership re-check ATTEMPT, epoch seconds */
    checkedAt: number;
    /** last SUCCESSFUL membership re-check, epoch seconds */
    verifiedAt: number;
    /** refresh token, sealed with AES-GCM (never stored in the clear) */
    refreshToken: string | null;
    revokedAt: number | null;
}
export type SessionPatch = Partial<Pick<StoredPortalSession, "email" | "name" | "roles" | "permissions" | "checkedAt" | "verifiedAt" | "refreshToken">>;
export interface PortalSessionStore {
    create(session: StoredPortalSession): Promise<void>;
    /** The record, or null. Revoked and expired records may be returned; portal-auth checks them. */
    get(id: string): Promise<StoredPortalSession | null>;
    revoke(id: string): Promise<void>;
    /**
     * Update a live (not revoked) session. When `ifCheckedAt` is given, update
     * only if checked_at still equals it (claims the re-check so two parallel
     * requests never spend the same rotating refresh token). Returns whether a
     * row was updated.
     */
    touch(id: string, patch: SessionPatch, ifCheckedAt?: number): Promise<boolean>;
}
/** The table the D1 store expects. Put this in the portal's migrations. */
export declare const PORTAL_SESSIONS_MIGRATION = "-- @aspire/portal-auth server-side sessions (revocable portal sign-in)\nCREATE TABLE IF NOT EXISTS portal_sessions (\n  id            TEXT PRIMARY KEY,          -- random 256-bit id; the cookie holds it, HMAC-signed\n  sub           TEXT NOT NULL,             -- auth host user id\n  email         TEXT NOT NULL,\n  name          TEXT NOT NULL,\n  org           TEXT NOT NULL,             -- this portal's org slug\n  roles         TEXT NOT NULL,             -- JSON array\n  permissions   TEXT NOT NULL,             -- JSON array, e.g. [\"hr_notes:read\"]\n  created_at    INTEGER NOT NULL,          -- epoch seconds\n  expires_at    INTEGER NOT NULL,          -- absolute end of the session\n  checked_at    INTEGER NOT NULL,          -- last membership re-check attempt\n  verified_at   INTEGER NOT NULL,          -- last successful re-check\n  refresh_token TEXT,                      -- AES-GCM sealed; never the raw token\n  revoked_at    INTEGER                    -- set on logout or failed re-check\n);\nCREATE INDEX IF NOT EXISTS portal_sessions_sub_idx ON portal_sessions (sub);\nCREATE INDEX IF NOT EXISTS portal_sessions_expires_idx ON portal_sessions (expires_at);\n";
/** Structural subset of Cloudflare D1 used by the store. */
export interface D1Like {
    prepare(sql: string): {
        bind(...values: unknown[]): {
            first<T = Record<string, unknown>>(): Promise<T | null>;
            run(): Promise<{
                meta?: {
                    changes?: number;
                };
            }>;
        };
    };
}
export declare function createD1SessionStore(db: D1Like, opts?: {
    table?: string;
}): PortalSessionStore;
/** In-memory store for tests and local development (not shared across isolates). */
export declare function createMemorySessionStore(): PortalSessionStore & {
    rows: Map<string, StoredPortalSession>;
};
export declare function sealToken(secret: string, token: string, sessionId: string): Promise<string>;
export declare function openToken(secret: string, sealed: string, sessionId: string): Promise<string | null>;
