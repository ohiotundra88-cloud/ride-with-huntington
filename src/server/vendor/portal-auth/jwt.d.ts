export interface Jwk {
    kty: string;
    kid?: string;
    alg?: string;
    crv?: string;
    x?: string;
    y?: string;
    use?: string;
}
export interface Jwks {
    keys: Jwk[];
}
export interface JwtClaims {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    azp?: string;
    exp?: number;
    iat?: number;
    nbf?: number;
    nonce?: string;
    [k: string]: unknown;
}
export declare class TokenError extends Error {
    code: "malformed" | "unsupported_alg" | "unknown_key" | "bad_signature" | "wrong_issuer" | "wrong_audience" | "expired" | "not_yet_valid" | "nonce_mismatch";
    constructor(code: "malformed" | "unsupported_alg" | "unknown_key" | "bad_signature" | "wrong_issuer" | "wrong_audience" | "expired" | "not_yet_valid" | "nonce_mismatch", message?: string);
}
export declare function decodeJwt(token: string): {
    header: {
        alg?: string;
        kid?: string;
        typ?: string;
    };
    claims: JwtClaims;
    signingInput: string;
    signature: Uint8Array<ArrayBuffer>;
};
export interface VerifyOptions {
    issuer: string;
    audience: string;
    nonce?: string;
    /** seconds since epoch */
    now?: number;
    clockToleranceSeconds?: number;
    /** Resolve a JWKS; called again with refresh=true once when the kid is unknown. */
    getJwks: (refresh: boolean) => Promise<Jwks>;
}
export declare function verifyIdToken(token: string, o: VerifyOptions): Promise<JwtClaims>;
