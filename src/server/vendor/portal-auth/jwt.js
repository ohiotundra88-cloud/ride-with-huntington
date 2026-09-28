/**
 * ID token verification with WebCrypto only. Supports ES256 (the auth host's
 * signing algorithm) and EdDSA (Ed25519), selected by the JWK, never by the
 * token header alone. No "none", no HMAC algorithms, no key from the token.
 */
import { fromB64url, fromUtf8, utf8 } from "./encoding.js";
export class TokenError extends Error {
    code;
    constructor(code, message) {
        super(message ?? code);
        this.code = code;
        this.name = "TokenError";
    }
}
const ALGS = {
    ES256: { kty: "EC", crv: "P-256" },
    EdDSA: { kty: "OKP", crv: "Ed25519" },
};
export function decodeJwt(token) {
    const parts = token.split(".");
    if (parts.length !== 3)
        throw new TokenError("malformed");
    const [h, p, s] = parts;
    try {
        const header = JSON.parse(fromUtf8(fromB64url(h)));
        const claims = JSON.parse(fromUtf8(fromB64url(p)));
        if (!header || typeof header !== "object" || !claims || typeof claims !== "object")
            throw new Error("not objects");
        return { header, claims, signingInput: `${h}.${p}`, signature: fromB64url(s) };
    }
    catch {
        throw new TokenError("malformed");
    }
}
async function importJwk(jwk, alg) {
    const pub = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
    if (alg === "ES256")
        return crypto.subtle.importKey("jwk", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    if (alg === "EdDSA")
        return crypto.subtle.importKey("jwk", pub, { name: "Ed25519" }, false, ["verify"]);
    throw new TokenError("unsupported_alg");
}
function pickKey(jwks, kid, alg) {
    const want = ALGS[alg];
    const candidates = jwks.keys.filter((k) => k.kty === want.kty && (!want.crv || k.crv === want.crv) && (!k.alg || k.alg === alg) && (!k.use || k.use === "sig"));
    if (kid)
        return candidates.find((k) => k.kid === kid);
    return candidates.length === 1 ? candidates[0] : undefined;
}
export async function verifyIdToken(token, o) {
    const { header, claims, signingInput, signature } = decodeJwt(token);
    const alg = header.alg ?? "";
    if (!ALGS[alg])
        throw new TokenError("unsupported_alg", `alg ${alg} not accepted`);
    let jwk = pickKey(await o.getJwks(false), header.kid, alg);
    if (!jwk)
        jwk = pickKey(await o.getJwks(true), header.kid, alg);
    if (!jwk)
        throw new TokenError("unknown_key");
    const key = await importJwk(jwk, alg);
    const params = alg === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : { name: "Ed25519" };
    const ok = await crypto.subtle.verify(params, key, signature, utf8(signingInput));
    if (!ok)
        throw new TokenError("bad_signature");
    const now = o.now ?? Math.floor(Date.now() / 1000);
    const skew = o.clockToleranceSeconds ?? 60;
    if (claims.iss !== o.issuer)
        throw new TokenError("wrong_issuer");
    const aud = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (!aud.includes(o.audience))
        throw new TokenError("wrong_audience");
    if (aud.length > 1 && claims.azp !== o.audience)
        throw new TokenError("wrong_audience", "azp mismatch");
    if (typeof claims.exp !== "number" || claims.exp + skew <= now)
        throw new TokenError("expired");
    if (typeof claims.nbf === "number" && claims.nbf - skew > now)
        throw new TokenError("not_yet_valid");
    if (typeof claims.iat === "number" && claims.iat - skew > now)
        throw new TokenError("not_yet_valid");
    if (o.nonce !== undefined && claims.nonce !== o.nonce)
        throw new TokenError("nonce_mismatch");
    return claims;
}
