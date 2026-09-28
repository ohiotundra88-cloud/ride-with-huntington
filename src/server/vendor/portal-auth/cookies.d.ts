export declare function sign(value: unknown, secret: string, purpose: string): Promise<string>;
/** Returns the parsed value, or null if missing, tampered or malformed. */
export declare function unsign<T>(
  signed: string | null | undefined,
  secret: string,
  purpose: string,
): Promise<T | null>;
export declare function readCookie(request: Request, name: string): string | null;
export interface CookieOptions {
  maxAge: number;
  secure: boolean;
  path?: string;
}
export declare function serializeCookie(name: string, value: string, o: CookieOptions): string;
export declare function clearCookie(name: string, secure: boolean, path?: string): string;
