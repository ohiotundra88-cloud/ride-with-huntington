/**
 * Server-side portal sessions (revocable). When a portal passes a `store` to
 * createPortalAuth, the cookie carries only a signed session id; the session
 * record lives here, logout revokes it, and membership is re-checked against
 * the auth host every `refreshAfterSeconds`.
 *
 * Zero dependencies: the D1 store is typed structurally, so this package does
 * not import @cloudflare/workers-types.
 */
import { b64url, fromB64url, fromUtf8, utf8 } from "./encoding.js";
/** The table the D1 store expects. Put this in the portal's migrations. */
export const PORTAL_SESSIONS_MIGRATION = `-- @aspire/portal-auth server-side sessions (revocable portal sign-in)
CREATE TABLE IF NOT EXISTS portal_sessions (
  id            TEXT PRIMARY KEY,          -- random 256-bit id; the cookie holds it, HMAC-signed
  sub           TEXT NOT NULL,             -- auth host user id
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  org           TEXT NOT NULL,             -- this portal's org slug
  roles         TEXT NOT NULL,             -- JSON array
  permissions   TEXT NOT NULL,             -- JSON array, e.g. ["hr_notes:read"]
  created_at    INTEGER NOT NULL,          -- epoch seconds
  expires_at    INTEGER NOT NULL,          -- absolute end of the session
  checked_at    INTEGER NOT NULL,          -- last membership re-check attempt
  verified_at   INTEGER NOT NULL,          -- last successful re-check
  refresh_token TEXT,                      -- AES-GCM sealed; never the raw token
  revoked_at    INTEGER                    -- set on logout or failed re-check
);
CREATE INDEX IF NOT EXISTS portal_sessions_sub_idx ON portal_sessions (sub);
CREATE INDEX IF NOT EXISTS portal_sessions_expires_idx ON portal_sessions (expires_at);
`;
const COLUMNS = {
    email: "email",
    name: "name",
    roles: "roles",
    permissions: "permissions",
    checkedAt: "checked_at",
    verifiedAt: "verified_at",
    refreshToken: "refresh_token",
};
function encodeValue(key, v) {
    return key === "roles" || key === "permissions" ? JSON.stringify(v ?? []) : (v ?? null);
}
export function createD1SessionStore(db, opts = {}) {
    const table = opts.table ?? "portal_sessions";
    if (!/^[a-z_][a-z0-9_]*$/.test(table))
        throw new Error("portal-auth: invalid session table name");
    let lastPrune = 0;
    return {
        async create(s) {
            await db
                .prepare(`INSERT INTO ${table} (id, sub, email, name, org, roles, permissions, created_at, expires_at, checked_at, verified_at, refresh_token, revoked_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`)
                .bind(s.id, s.sub, s.email, s.name, s.org, JSON.stringify(s.roles), JSON.stringify(s.permissions), s.createdAt, s.expiresAt, s.checkedAt, s.verifiedAt, s.refreshToken)
                .run();
            // Opportunistic cleanup: at most once a minute per isolate, drop rows a day past expiry.
            const now = Math.floor(Date.now() / 1000);
            if (now - lastPrune > 60) {
                lastPrune = now;
                await db.prepare(`DELETE FROM ${table} WHERE expires_at < ?`).bind(now - 86400).run().catch(() => { });
            }
        },
        async get(id) {
            const r = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
            if (!r)
                return null;
            return {
                id: String(r.id),
                sub: String(r.sub),
                email: String(r.email),
                name: String(r.name),
                org: String(r.org),
                roles: JSON.parse(String(r.roles ?? "[]")),
                permissions: JSON.parse(String(r.permissions ?? "[]")),
                createdAt: Number(r.created_at),
                expiresAt: Number(r.expires_at),
                checkedAt: Number(r.checked_at),
                verifiedAt: Number(r.verified_at),
                refreshToken: r.refresh_token == null ? null : String(r.refresh_token),
                revokedAt: r.revoked_at == null ? null : Number(r.revoked_at),
            };
        },
        async revoke(id) {
            await db.prepare(`UPDATE ${table} SET revoked_at = ?, refresh_token = NULL WHERE id = ? AND revoked_at IS NULL`).bind(Math.floor(Date.now() / 1000), id).run();
        },
        async touch(id, patch, ifCheckedAt) {
            const keys = Object.keys(patch).filter((k) => k in COLUMNS);
            if (!keys.length)
                return false;
            const set = keys.map((k) => `${COLUMNS[k]} = ?`).join(", ");
            const values = keys.map((k) => encodeValue(k, patch[k]));
            const cond = ifCheckedAt === undefined ? "" : " AND checked_at = ?";
            const res = await db
                .prepare(`UPDATE ${table} SET ${set} WHERE id = ? AND revoked_at IS NULL${cond}`)
                .bind(...values, id, ...(ifCheckedAt === undefined ? [] : [ifCheckedAt]))
                .run();
            return (res.meta?.changes ?? 0) === 1;
        },
    };
}
/** In-memory store for tests and local development (not shared across isolates). */
export function createMemorySessionStore() {
    const rows = new Map();
    return {
        rows,
        async create(s) {
            rows.set(s.id, structuredClone(s));
        },
        async get(id) {
            const r = rows.get(id);
            return r ? structuredClone(r) : null;
        },
        async revoke(id) {
            const r = rows.get(id);
            if (r && r.revokedAt === null) {
                r.revokedAt = Math.floor(Date.now() / 1000);
                r.refreshToken = null;
            }
        },
        async touch(id, patch, ifCheckedAt) {
            const r = rows.get(id);
            if (!r || r.revokedAt !== null)
                return false;
            if (ifCheckedAt !== undefined && r.checkedAt !== ifCheckedAt)
                return false;
            Object.assign(r, structuredClone(patch));
            return true;
        },
    };
}
/* ---------- refresh token sealing (AES-GCM, key = HKDF(sessionSecret)) ---------- */
const sealKeys = new Map();
function sealKey(secret) {
    let k = sealKeys.get(secret);
    if (!k) {
        k = (async () => {
            const ikm = await crypto.subtle.importKey("raw", utf8(secret), "HKDF", false, ["deriveKey"]);
            return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: utf8("aspire-portal-auth"), info: utf8("refresh-token-v1") }, ikm, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        })();
        sealKeys.set(secret, k);
    }
    return k;
}
export async function sealToken(secret, token, sessionId) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: utf8(sessionId) }, await sealKey(secret), utf8(token));
    return `v1.${b64url(iv)}.${b64url(ct)}`;
}
export async function openToken(secret, sealed, sessionId) {
    const [v, iv, ct] = sealed.split(".");
    if (v !== "v1" || !iv || !ct)
        return null;
    try {
        const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64url(iv), additionalData: utf8(sessionId) }, await sealKey(secret), fromB64url(ct));
        return fromUtf8(new Uint8Array(pt));
    }
    catch {
        return null;
    }
}
