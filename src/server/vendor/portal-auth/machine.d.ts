/**
 * Machine tokens (Aspire Identity machine clients, OPS-230 decision 3).
 *
 * Shared constants for both sides, the portal-side claim checks, and a small
 * token source for the caller (Aria's scripts and crons). The verifying code
 * that needs the JWKS lives in createPortalAuth (index.ts).
 */
/** The only `token_use` a portal accepts on a bearer token. */
export declare const MACHINE_TOKEN_USE = "machine";
/** A machine token may never claim a longer life than this (decision 3: at most 15 minutes). */
export declare const MACHINE_TOKEN_MAX_TTL_SECONDS = 900;
/**
 * Permissions a machine token may never carry (security review H1): money
 * out, settings, HR, applicants and membership. The auth host never issues
 * them; a portal refuses a token that carries any of them (403
 * machine-token-overreach).
 */
export declare function isMachineDeniedPermission(permission: string): boolean;
/** Default: machine bearer tokens are accepted only under this path prefix. */
export declare const DEFAULT_MACHINE_API_PREFIX = "/api/";
/** Audience of a machine token for one organization. The auth host signs the same string. */
export declare function machineAudience(orgSlug: string): string;
export interface MachineAuditEvent {
    event: "machine.used" | "machine.denied";
    /** epoch seconds */
    at: number;
    org: string;
    method: string;
    path: string;
    clientId: string | null;
    jti: string | null;
    /** Set on machine.denied, and on machine.used it is absent. */
    reason?: string;
    /** HTTP status the portal will answer with, on machine.denied. */
    status?: number;
}
export interface MachineAuthConfig {
    /**
     * Required. Called for every machine request, accepted or refused. Write it
     * to the portal's audit log (decision 3: every use audited). A throw here
     * refuses the request, so an audit outage never lets a call through.
     */
    audit: (e: MachineAuditEvent) => void | Promise<void>;
    /** Machine tokens are refused outside this path prefix. Default "/api/". */
    apiPathPrefix?: string;
}
/**
 * Client side: fetch and cache a machine token. Asks the auth host's token
 * endpoint with client_secret_basic and refreshes 30 seconds before expiry.
 * For servers and scripts only. Never ship a machine secret to a browser.
 */
export declare function createMachineTokenSource(cfg: {
    authBaseUrl: string;
    clientId: string;
    clientSecret: string;
    /** Optional: the org the token must be for. The auth host refuses any other. */
    org?: string;
    fetch?: typeof fetch;
    now?: () => number;
}): {
    getToken: () => Promise<string>;
    /** Headers for a portal API call. */
    headers(extra?: Record<string, string>): Promise<Record<string, string>>;
    /** Forget the cached token (for example after the client was rotated). */
    clear(): void;
};
