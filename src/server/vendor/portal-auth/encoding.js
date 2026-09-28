const enc = new TextEncoder();
const dec = new TextDecoder();
export function utf8(s) {
    const u = enc.encode(s);
    const out = new Uint8Array(new ArrayBuffer(u.length));
    out.set(u);
    return out;
}
export function fromUtf8(b) {
    return dec.decode(b);
}
export function b64url(bytes) {
    const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = "";
    for (let i = 0; i < u.length; i++)
        s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64url(str) {
    if (!/^[A-Za-z0-9_-]*$/.test(str))
        throw new Error("invalid base64url");
    const norm = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
    const bin = atob(norm + pad);
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++)
        out[i] = bin.charCodeAt(i);
    return out;
}
export function randomB64url(bytes = 32) {
    return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
export function timingSafeEqual(a, b) {
    const ab = enc.encode(a);
    const bb = enc.encode(b);
    let diff = ab.length ^ bb.length;
    const len = Math.max(ab.length, bb.length);
    for (let i = 0; i < len; i++)
        diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
    return diff === 0;
}
