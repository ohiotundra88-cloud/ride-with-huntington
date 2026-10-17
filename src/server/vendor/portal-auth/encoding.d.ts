export declare function utf8(s: string): Uint8Array<ArrayBuffer>;
export declare function fromUtf8(b: Uint8Array): string;
export declare function b64url(bytes: Uint8Array | ArrayBuffer): string;
export declare function fromB64url(str: string): Uint8Array<ArrayBuffer>;
export declare function randomB64url(bytes?: number): string;
export declare function timingSafeEqual(a: string, b: string): boolean;
