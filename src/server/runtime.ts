/**
 * Runtime configuration for the server.
 *
 * Settings and secrets are plain environment variables everywhere (Cloudflare
 * Workers vars/secrets, Azure App Settings, a local .env). Platform bindings
 * that aren't strings (R2 buckets, D1 databases) arrive with each Workers
 * request (see bindings() below).
 */

type Bindings = Record<string, unknown>;

/**
 * On Cloudflare Workers, Nitro's cloudflare-module preset stores the request's
 * `env` (vars, secrets and bindings) on globalThis.__env__. Elsewhere it's absent.
 */
function bindings(): Bindings {
  const env = (globalThis as { __env__?: unknown }).__env__;
  return env && typeof env === "object" ? (env as Bindings) : {};
}

/** A string setting or secret. Throws with a clear message when required and missing. */
export function setting(name: string): string;
export function setting(name: string, opts: { optional: true }): string | undefined;
export function setting(name: string, opts?: { optional: true }): string | undefined {
  const fromBinding = bindings()[name];
  const value =
    typeof fromBinding === "string" && fromBinding
      ? fromBinding
      : typeof process !== "undefined"
        ? process.env[name]
        : undefined;
  if (!value && !opts?.optional) {
    throw new Error(`Missing server setting ${name}. See docs/CONFIGURATION.md.`);
  }
  return value || undefined;
}

/** A platform binding (R2 bucket, D1 database), or undefined outside Workers. */
export function binding<T>(name: string): T | undefined {
  return bindings()[name] as T | undefined;
}
