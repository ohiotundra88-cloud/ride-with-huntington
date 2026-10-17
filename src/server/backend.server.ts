/**
 * The Hub's data layer.
 *
 * Data lives in PostgreSQL and is reached through PostgREST, so the app keeps
 * using the familiar supabase-js query builder (`.from("table").select()`).
 * Every request carries a short-lived JWT naming the database role
 * (`anon`, `authenticated`, `service_role`) and, for signed-in people, their
 * user id; the database's row-level security rules decide what they can see.
 *
 * Files live in object storage (Cloudflare R2 today; Azure Blob later) behind
 * a tiny adapter with the same upload/download/remove calls the app used.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { binding, setting } from "./runtime";

export type DbRole = "anon" | "authenticated" | "service_role";
export type Db = SupabaseClient<Database>;

const TOKEN_TTL_SECONDS = 300;

function b64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let s = "";
  for (const b of raw) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let signingKey: { secret: string; key: CryptoKey } | undefined;

async function hmacKey(): Promise<CryptoKey> {
  const secret = setting("HUB_DB_JWT_SECRET");
  if (signingKey?.secret !== secret) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    signingKey = { secret, key };
  }
  return signingKey.key;
}

/** Signs the JWT PostgREST uses to pick the database role and user. */
export async function databaseToken(
  role: DbRole,
  user?: { id: string; email: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      ...(user ? { sub: user.id, email: user.email } : {}),
    }),
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

/** Headers that get a request through the private tunnel to the database host. */
export function databaseGatewayHeaders(): Record<string, string> {
  const id = setting("HUB_DB_ACCESS_CLIENT_ID", { optional: true });
  const secret = setting("HUB_DB_ACCESS_CLIENT_SECRET", { optional: true });
  return id && secret ? { "CF-Access-Client-Id": id, "CF-Access-Client-Secret": secret } : {};
}

export function databaseUrl(): string {
  return setting("HUB_DB_URL").replace(/\/+$/, "");
}

function gatewayFetch(): typeof fetch {
  const extra = databaseGatewayHeaders();
  return (input, init) => {
    const headers = new Headers(init?.headers);
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
    return fetch(input, { ...init, headers });
  };
}

/**
 * A query client acting as `role` (and `user`, when signed in). A fresh
 * short-lived token is signed for every request, so clients can be reused.
 */
export function createDbClient(role: DbRole, user?: { id: string; email: string }): Db {
  return createClient<Database>(databaseUrl(), "hub", {
    accessToken: () => databaseToken(role, user),
    global: { fetch: gatewayFetch() },
  });
}

// ---------------------------------------------------------------------------
// File storage
// ---------------------------------------------------------------------------

interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
}
interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | Blob,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(keys: string | string[]): Promise<void>;
}

type StorageResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

function filesBucket(): R2BucketLike {
  const bucket = binding<R2BucketLike>("HUB_FILES");
  if (!bucket) throw new Error("File storage (HUB_FILES) is not configured.");
  return bucket;
}

function objectKey(bucket: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  if (!clean || clean.split("/").some((p) => p === ".." || p === ""))
    throw new Error("Invalid storage path");
  return `${bucket}/${clean}`;
}

/** Same shape as the storage calls the app already makes. */
export const storage = {
  from(bucket: string) {
    return {
      async upload(
        path: string,
        body: ArrayBuffer | Uint8Array | Blob,
        opts?: { contentType?: string; upsert?: boolean },
      ): Promise<StorageResult<{ path: string }>> {
        try {
          await filesBucket().put(objectKey(bucket, path), body, {
            httpMetadata: opts?.contentType ? { contentType: opts.contentType } : undefined,
          });
          return { data: { path }, error: null };
        } catch (e) {
          return {
            data: null,
            error: { message: e instanceof Error ? e.message : "Upload failed" },
          };
        }
      },
      async download(path: string): Promise<StorageResult<Blob>> {
        try {
          const obj = await filesBucket().get(objectKey(bucket, path));
          if (!obj) return { data: null, error: { message: "Object not found" } };
          const type = obj.httpMetadata?.contentType ?? "application/octet-stream";
          return { data: new Blob([await obj.arrayBuffer()], { type }), error: null };
        } catch (e) {
          return {
            data: null,
            error: { message: e instanceof Error ? e.message : "Download failed" },
          };
        }
      },
      async remove(paths: string[]): Promise<StorageResult<{ path: string }[]>> {
        try {
          if (paths.length) await filesBucket().delete(paths.map((p) => objectKey(bucket, p)));
          return { data: paths.map((path) => ({ path })), error: null };
        } catch (e) {
          return {
            data: null,
            error: { message: e instanceof Error ? e.message : "Delete failed" },
          };
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Account administration (replaces the Supabase Auth admin API)
// ---------------------------------------------------------------------------

export interface HubAccount {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  user_metadata: { full_name?: string };
}

type AdminResult<T> = { data: T; error: null } | { data: T; error: { message: string } };

export function accountAdmin(db: Db) {
  const rpc = db.rpc.bind(db) as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return {
    async createUser(input: {
      email: string;
      user_metadata?: { full_name?: string };
    }): Promise<AdminResult<{ user: { id: string } | null }>> {
      const { data, error } = await rpc("hub_create_user", {
        p_email: input.email,
        p_name: input.user_metadata?.full_name ?? "",
      });
      return error
        ? { data: { user: null }, error }
        : { data: { user: { id: String(data) } }, error: null };
    },
    async deleteUser(id: string): Promise<AdminResult<null>> {
      const { error } = await rpc("hub_delete_user", { p_id: id });
      return { data: null, error };
    },
    async listUsers(): Promise<AdminResult<{ users: HubAccount[] }>> {
      const { data, error } = await rpc("hub_list_users");
      const rows = (Array.isArray(data) ? data : []) as (Omit<HubAccount, "user_metadata"> & {
        full_name: string | null;
      })[];
      return {
        data: {
          users: rows.map(({ full_name, ...u }) => ({
            ...u,
            user_metadata: { full_name: full_name ?? undefined },
          })),
        },
        error,
      };
    },
    async getUserById(id: string): Promise<AdminResult<{ user: HubAccount | null }>> {
      const { data, error } = await this.listUsers();
      return { data: { user: data.users.find((u) => u.id === id) ?? null }, error };
    },
  };
}
