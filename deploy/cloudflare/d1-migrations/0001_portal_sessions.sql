-- @aspire/portal-auth server-side sessions (revocable portal sign-in)
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
