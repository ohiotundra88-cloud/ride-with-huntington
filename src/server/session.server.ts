/**
 * Who is signed in.
 *
 * Sign-in is delegated to an OpenID Connect provider — Aspire Identity today
 * (auth.madebyaspire.com). This is the only file that knows which provider
 * is used: moving to Microsoft Entra ID means replacing the portal-auth calls
 * below with an Entra OIDC client and keeping `currentUser()` the same.
 */
import {
  createD1SessionStore,
  createPortalAuth,
  type D1Like,
  type PortalSession,
} from "./vendor/portal-auth/index.js";
import { binding, setting } from "./runtime";
import { createDbClient } from "./backend.server";
import { recoverSignIn } from "./sign-in-recovery";

export interface HubUser {
  /** Hub user id (auth.users.id) used throughout the database. */
  id: string;
  email: string;
  name: string;
  /** Roles granted by the identity provider for this org (not Hub roles). */
  providerRoles: string[];
}

type PortalAuth = ReturnType<typeof createPortalAuth>;
let cached: { key: string; auth: PortalAuth } | undefined;

function portalAuth(): PortalAuth {
  const cfg = {
    authBaseUrl: setting("AUTH_BASE_URL"),
    clientId: setting("AUTH_CLIENT_ID"),
    clientSecret: setting("AUTH_CLIENT_SECRET"),
    portalOrigin: setting("PUBLIC_ORIGIN"),
    orgSlug: setting("AUTH_ORG_SLUG"),
    sessionSecret: setting("SESSION_SECRET"),
    cookieName: "hub_session",
  };
  const key = `${cfg.authBaseUrl}|${cfg.clientId}|${cfg.portalOrigin}|${cfg.orgSlug}`;
  if (cached?.key !== key) {
    const db = binding<D1Like>("HUB_SESSIONS");
    cached = {
      key,
      auth: createPortalAuth({ ...cfg, ...(db ? { store: createD1SessionStore(db) } : {}) }),
    };
  }
  return cached.auth;
}

export const signIn = (request: Request) => portalAuth().login(request);
export const completeSignIn = async (request: Request) =>
  recoverSignIn(request, await portalAuth().callback(request));
export const signOut = (request: Request) => portalAuth().logout(request);

// Provider subject -> Hub user id, remembered for the life of the isolate.
const userIds = new Map<string, { id: string; at: number }>();
const USER_ID_TTL_MS = 10 * 60_000;

async function hubUserId(session: PortalSession): Promise<string> {
  const hit = userIds.get(session.sub);
  if (hit && Date.now() - hit.at < USER_ID_TTL_MS) return hit.id;
  const db = createDbClient("service_role");
  const rpc = db as unknown as {
    rpc(
      fn: string,
      args: Record<string, unknown>,
    ): Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await rpc.rpc("hub_sign_in", {
    p_subject: session.sub,
    p_email: session.email,
    p_name: session.name,
  });
  if (error || !data)
    throw new Error(`Could not open your Hub account: ${error?.message ?? "no id"}`);
  const id = String(data);
  userIds.set(session.sub, { id, at: Date.now() });
  return id;
}

/** The signed-in person for this request, or null. */
export async function currentUser(request: Request): Promise<HubUser | null> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("hub_session")) return null;
  const session = await portalAuth().getSession(request);
  if (!session) return null;
  return {
    id: await hubUserId(session),
    email: session.email.toLowerCase(),
    name: session.name,
    providerRoles: session.roles,
  };
}
