# Sign-in with Microsoft Entra ID

Today the Hub signs people in through Aspire Identity, the builder's OpenID Connect service. At Huntington it should use Microsoft Entra ID. The app was built for this swap: only `src/server/session.server.ts` knows which provider is used, and everything else asks it one question, `currentUser(request)`.

## What stays the same

- `currentUser(request)` returns `{ id, email, name, providerRoles }` or `null`. Keep that contract and nothing else in the app changes.
- The routes `/auth/login`, `/auth/callback`, `/auth/logout` and `/auth/me` (in `src/routes/auth/`) keep calling `signIn`, `completeSignIn`, `signOut` and `currentUser`.
- A provider identity becomes a Hub user through the database function `hub_sign_in(subject, email, name)`. It finds or creates the `auth.users` row the rest of the data hangs off.
- Hub roles (admin, super user, captain, reviewers, and so on) live in the `user_roles` table and are managed in the app at `/admin/users`. The identity provider's roles are not used for authorization today.
- The database only accepts `@huntington.com` accounts, plus any address in `hub_email_allowlist`.

## 1. Register the app in Entra ID

In the Microsoft Entra admin center, App registrations, New registration:

| Setting                  | Value                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Name                     | Team Huntington Hub (one registration per environment is easiest: dev, test, prod)                              |
| Supported account types  | Accounts in this organizational directory only (single tenant)                                                  |
| Platform                 | Web                                                                                                             |
| Redirect URI             | `https://<hub hostname>/auth/callback` (must equal `<PUBLIC_ORIGIN>/auth/callback` exactly)                     |
| Local development        | A separate dev registration with `http://localhost:5173/auth/callback` (Entra allows `http` only for localhost) |
| Front-channel logout URL | Leave empty                                                                                                     |
| Post-logout redirect URI | Register `https://<hub hostname>/` if you send people back to the Hub after sign-out                            |
| Credentials              | A client secret or, better, a certificate or federated credential (managed identity). Store it in Key Vault.    |
| Token configuration      | Add the optional ID token claims `email` and `upn` if they are not already present                              |
| API permissions          | None beyond the default. `openid`, `profile` and `email` are standard OpenID scopes.                            |

**Who may sign in.** Under Enterprise applications, open the app, set "Assignment required" to Yes, and assign a security group (for example "Team Huntington Hub users"). This replaces the Aspire Identity organization check (`AUTH_ORG_SLUG`). People outside the group are stopped by Entra before they reach the Hub.

## 2. Map claims to the Hub user

| Hub field       | Entra ID token claim                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subject`       | **`oid`** (the person's object id in the tenant). Prefer it over `sub`: `sub` is different for every app registration, so recreating the registration would orphan every account. Also check `tid` equals Huntington's tenant id. |
| `email`         | `email` if present, else `preferred_username` (the UPN, usually the work email). Lower-case it.                                                                                                                                   |
| `name`          | `name`                                                                                                                                                                                                                            |
| `providerRoles` | `roles` (app roles, if you define them; see section 5), else an empty list                                                                                                                                                        |

`hub_sign_in` then:

1. finds the account by subject (`auth.users.identity_subject`) and refreshes its email,
2. or claims an account an admin pre-created with the same email and no subject yet,
3. or creates a new account. The Huntington-only trigger rejects a non-Huntington email not in `hub_email_allowlist` (`23514 Only @huntington.com addresses are accepted.`).

Because `oid` is stable, a colleague whose name and UPN change keeps the same Hub account, and their email is updated on the next sign-in.

## 3. Change `src/server/session.server.ts`

Replace the Aspire Identity client (`createPortalAuth`) with a standard OpenID Connect client. [`openid-client`](https://github.com/panva/openid-client) version 6 is a good fit (small, standards based, works on Node). MSAL Node (`@azure/msal-node`) also works if Huntington prefers Microsoft's library.

Keep the four exports. A sketch with `openid-client` 6 (the function names below were checked against version 6.8.8; treat the rest as a starting point and test it):

```ts
import * as oidc from "openid-client";
import {
  sign,
  unsign,
  readCookie,
  serializeCookie,
  clearCookie,
} from "./vendor/portal-auth/cookies.js";
import { setting } from "./runtime";
import { createDbClient } from "./backend.server";

const TX = "hub_session_tx";
const TTL = 8 * 3600; // seconds
let config: Promise<oidc.Configuration> | undefined;

function entra() {
  config ??= oidc.discovery(
    new URL(`https://login.microsoftonline.com/${setting("ENTRA_TENANT_ID")}/v2.0`),
    setting("AUTH_CLIENT_ID"),
    setting("AUTH_CLIENT_SECRET"),
  );
  return config;
}
const origin = () => setting("PUBLIC_ORIGIN").replace(/\/+$/, "");
const secure = () => origin().startsWith("https://");
const cookieName = () => (secure() ? "__Host-hub_session" : "hub_session");
const safeReturnTo = (v: string | null) =>
  v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/";

export async function signIn(request: Request) {
  const verifier = oidc.randomPKCECodeVerifier();
  const tx = {
    verifier,
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
    returnTo: safeReturnTo(new URL(request.url).searchParams.get("returnTo")),
  };
  const url = oidc.buildAuthorizationUrl(await entra(), {
    redirect_uri: `${origin()}/auth/callback`,
    scope: "openid profile email",
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state: tx.state,
    nonce: tx.nonce,
  });
  const cookie = serializeCookie(TX, await sign(tx, setting("SESSION_SECRET"), "tx"), {
    maxAge: 600,
    secure: secure(),
  });
  return new Response(null, { status: 302, headers: { location: url.href, "set-cookie": cookie } });
}

export async function completeSignIn(request: Request) {
  const tx = await unsign(readCookie(request, TX), setting("SESSION_SECRET"), "tx");
  if (!tx) return new Response("Sign-in expired. Please start again.", { status: 400 });
  const tokens = await oidc.authorizationCodeGrant(await entra(), new URL(request.url), {
    pkceCodeVerifier: tx.verifier,
    expectedState: tx.state,
    expectedNonce: tx.nonce,
  });
  const c = tokens.claims()!; // verified ID token claims
  if (c.tid !== setting("ENTRA_TENANT_ID")) return new Response("Wrong tenant", { status: 403 });
  const session = {
    sub: String(c.oid),
    email: String(c.email ?? c.preferred_username ?? "").toLowerCase(),
    name: String(c.name ?? ""),
    roles: Array.isArray(c.roles) ? c.roles.map(String) : [],
    exp: Math.floor(Date.now() / 1000) + TTL,
  };
  const headers = new Headers({ location: `${origin()}${tx.returnTo}` });
  headers.append("set-cookie", clearCookie(TX, secure()));
  headers.append(
    "set-cookie",
    serializeCookie(cookieName(), await sign(session, setting("SESSION_SECRET"), "session"), {
      maxAge: TTL,
      secure: secure(),
    }),
  );
  return new Response(null, { status: 302, headers });
}

export async function signOut(request: Request) {
  const end = oidc.buildEndSessionUrl(await entra(), { post_logout_redirect_uri: `${origin()}/` });
  return new Response(null, {
    status: 302,
    headers: { location: end.href, "set-cookie": clearCookie(cookieName(), secure()) },
  });
}

// currentUser(): read and unsign the cookie (purpose "session"), reject if expired,
// then map session.sub/email/name through hub_sign_in exactly as the current file does.
```

Settings after the change:

| Setting              | Change                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| `ENTRA_TENANT_ID`    | New. Huntington's tenant id (a GUID).                                         |
| `AUTH_CLIENT_ID`     | The app registration's Application (client) id.                               |
| `AUTH_CLIENT_SECRET` | The client secret (or switch to certificate or managed identity credentials). |
| `AUTH_BASE_URL`      | Remove.                                                                       |
| `AUTH_ORG_SLUG`      | Remove. Group assignment in Entra does this job.                              |
| `SESSION_SECRET`     | Keep.                                                                         |

Update [CONFIGURATION.md](CONFIGURATION.md), `.env.example` and the vendored folder's README when you make the change, and delete `src/server/vendor/portal-auth/` once nothing imports it.

Two improvements worth making at the same time:

- **Show a clear page when the database refuses someone.** Today, if `hub_sign_in` throws (for example an outside email that is not allowlisted), `currentUser` throws on every request. With `HUB_REQUIRE_SIGN_IN=true` the sign-in wall treats that as "signed out" and sends the person back to sign in, which can loop. Catch the refusal in `completeSignIn` and answer with a short "This account can't use the Hub" page instead.
- **Session length.** The sketch uses an 8-hour signed cookie that cannot be revoked early. If Huntington needs logout to end the session everywhere, store sessions in a Postgres table and keep only a signed id in the cookie (the vendored `store.js` shows the pattern).

## 4. The allowlist and bootstrap admins

Two small tables, both only readable by `service_role`, control who may have an account and who starts as an admin. Manage them with SQL as the database admin.

**`hub_email_allowlist`**: addresses that may hold an account even though they are not `@huntington.com`. Checked whenever an account is created or its email changes.

```sql
INSERT INTO public.hub_email_allowlist (email, note) VALUES ('vendor.person@example.com', 'why they need access');
DELETE FROM public.hub_email_allowlist WHERE email = 'vendor.person@example.com';
```

Removing an address does not delete an existing account; it only blocks creating one or changing an email to it. To audit accounts that exist with outside addresses (for example from the Lovable era, before the Huntington-only rule):

```sql
SELECT u.email, u.created_at, u.last_sign_in_at, a.email IS NOT NULL AS allowlisted
FROM auth.users u LEFT JOIN public.hub_email_allowlist a ON a.email = lower(u.email)
WHERE u.email !~* '^[^@[:space:]]+@huntington[.]com$'
ORDER BY u.created_at;
```

Decide case by case how to retire those accounts; deleting a user removes their data.

**`hub_bootstrap_admins`**: people who get the `admin` and `superuser` roles automatically when their account is created (the trigger fires on account creation, not on every sign-in).

```sql
INSERT INTO public.hub_bootstrap_admins (email) VALUES ('first.admin@huntington.com');
```

If the person already has an account, adding them here does nothing. Grant the roles in the app (`/admin/users`) or directly:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, r::public.app_role FROM auth.users, unnest(ARRAY['admin', 'superuser']) AS r
WHERE lower(email) = 'first.admin@huntington.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

Both tables were seeded for the preview (migration `20260928160000_self_host_identity.sql`) with Chris Kemper's Huntington address and the builder's personal address. For production, delete the builder's address from both tables and add Huntington's own first admins. Do it in a new migration so every environment matches.

## 5. Optional: manage Hub roles in Entra

Today Hub roles are granted inside the app. If Huntington would rather manage them with Entra groups:

1. Define app roles on the registration whose values match the Hub's role names: `admin`, `superuser`, `captain`, `vendor_captain`, `legal`, `risk`, `compliance`, `marketing`, `cochair`.
2. Assign groups to those app roles in the Enterprise application. Entra then sends them in the ID token's `roles` claim, which the sketch keeps as `providerRoles`.
3. On each sign-in, make `user_roles` match `providerRoles` (a new `SECURITY DEFINER` function called next to `hub_sign_in`, or code in `currentUser`).

Pick one source of truth. If Entra owns roles, hide or disable role editing at `/admin/users`, or the next sign-in will undo in-app changes.

## Cutover from Aspire Identity

Every existing account in a database copied from the preview has an Aspire Identity subject in `auth.users.identity_subject`. Entra sends a different subject (`oid`) for the same person. `hub_sign_in` would not find the old subject, would refuse to claim the account (it already has a subject), would try to create a second account with the same email, and would fail with `23505 duplicate key ... users_email_key`. That person could not sign in. This was reproduced against the real migrations.

Before the first Entra sign-in, clear the old subjects so everyone is matched by email once:

```sql
UPDATE auth.users SET identity_subject = NULL WHERE identity_subject IS NOT NULL;
```

From then on each account is tied to the person's Entra `oid`. Because accounts are claimed by email, do this only with a single-tenant registration whose emails Huntington controls.

## Testing checklist

Run these in a test environment with a dev or test app registration and `EMAIL_REDIRECT_TO` set.

| Case                                                  | Expected                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Colleague in the assigned group signs in              | Lands on the page they asked for; `/auth/me` shows their id, email and name     |
| Person not assigned to the app                        | Entra refuses before the Hub (error AADSTS50105)                                |
| Same person signs in twice                            | Same Hub user id both times (check `auth.users.identity_subject` = their `oid`) |
| Account pre-created on the roster, first sign-in      | Claims the pre-created account and its data; no second account                  |
| Email in `hub_bootstrap_admins`, first sign-in        | Has admin and super user access                                                 |
| Guest or non-Huntington email, not allowlisted        | Refused with a clear message (after the improvement above), no account created  |
| Tampered `returnTo` (`//evil.example`, `https://...`) | Redirects to `/` instead                                                        |
| Sign out                                              | Cookie cleared, Entra session ended, `/auth/me` returns `{"user":null}`         |
| Cookie after its lifetime                             | Treated as signed out                                                           |
| After cutover, an existing preview user signs in      | Keeps their registration, roles and fundraisers                                 |
| `HUB_REQUIRE_SIGN_IN=true`, signed out, open any page | Redirected to sign-in; API calls return 401                                     |

Also re-run `npm run test:db` and the security tests, since `hub_sign_in` and the allowlist are part of the security model.
