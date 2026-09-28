/** HMAC-SHA256 signed cookie values: base64url(json) + "." + base64url(mac). */
import { b64url, fromB64url, fromUtf8, utf8 } from "./encoding.js";
const keyCache = new Map();
function hmacKey(secret) {
    let k = keyCache.get(secret);
    if (!k) {
        k = crypto.subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
        keyCache.set(secret, k);
    }
    return k;
}
export async function sign(value, secret, purpose) {
    const body = b64url(utf8(JSON.stringify(value)));
    const mac = await crypto.subtle.sign("HMAC", await hmacKey(secret), utf8(`${purpose}.${body}`));
    return `${body}.${b64url(mac)}`;
}
/** Returns the parsed value, or null if missing, tampered or malformed. */
export async function unsign(signed, secret, purpose) {
    if (!signed)
        return null;
    const dot = signed.lastIndexOf(".");
    if (dot <= 0)
        return null;
    const body = signed.slice(0, dot);
    try {
        const mac = fromB64url(signed.slice(dot + 1));
        // crypto.subtle.verify compares in constant time.
        const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), mac, utf8(`${purpose}.${body}`));
        if (!ok)
            return null;
        return JSON.parse(fromUtf8(fromB64url(body)));
    }
    catch {
        return null;
    }
}
export function readCookie(request, name) {
    const header = request.headers.get("cookie");
    if (!header)
        return null;
    for (const part of header.split(";")) {
        const i = part.indexOf("=");
        if (i < 0)
            continue;
        if (part.slice(0, i).trim() === name)
            return decodeURIComponent(part.slice(i + 1).trim());
    }
    return null;
}
export function serializeCookie(name, value, o) {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path ?? "/"}`, "HttpOnly", "SameSite=Lax", `Max-Age=${o.maxAge}`];
    if (o.secure)
        parts.push("Secure");
    return parts.join("; ");
}
export function clearCookie(name, secure, path = "/") {
    return serializeCookie(name, "", { maxAge: 0, secure, path });
}
