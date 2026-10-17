/**
 * What to do when the sign-in callback refuses a visitor.
 *
 * The callback checks a short-lived sign-in cookie set when sign-in started.
 * It fails when that cookie is older than 10 minutes, was replaced by a second
 * sign-in started in another tab, or was dropped by a corporate web filter.
 * By then the visitor is already signed in at the identity provider, so
 * starting sign-in again finishes without asking for anything. We do that
 * once; if the retry fails too, the visitor gets a readable page instead of a
 * bare "400 login-expired".
 */

const RETRY_COOKIE = "hub_signin_retry";
const RETRY_TTL = 120;

/** Refusals that a fresh sign-in can fix. */
const RETRYABLE = new Set([
  "login-expired",
  "state-mismatch",
  "missing-code-or-state",
  "invalid_grant",
]);

/** The reason code from a portal-auth refusal body ("400 login-expired: start again"). */
export function refusalReason(body: string): string {
  return /^\d{3} ([A-Za-z_-]+)/.exec(body)?.[1] ?? "unknown";
}

function hasRetried(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(/;\s*/).some((c) => c.startsWith(`${RETRY_COOKIE}=`));
}

function retryCookie(maxAge: number): string {
  return `${RETRY_COOKIE}=${maxAge ? "1" : ""}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function page(reason: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign-in did not finish · Team Huntington Hub</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5;color:#1a1a1a}a.btn{display:inline-block;background:#00471b;color:#fff;padding:.7rem 1.2rem;border-radius:.4rem;text-decoration:none}small{color:#555}</style>
</head><body><div role="main">
<h1>Sign-in did not finish</h1>
<p>You signed in, but the Hub could not complete the last step. This usually happens when sign-in was started in more than one tab, took longer than 10 minutes, or a work web filter blocked the Hub's sign-in cookie.</p>
<p><a class="btn" href="/auth/login">Try again</a></p>
<p>If it keeps happening on the work network, try your phone off Wi-Fi, and send this code to the Hub team: <code>${reason}</code></p>
<small>Team Huntington Hub</small>
</div></body></html>`;
}

/**
 * Wrap the callback's response. Success passes through (and clears the retry
 * marker); a fixable refusal restarts sign-in once; anything else gets a page.
 */
export async function recoverSignIn(request: Request, res: Response): Promise<Response> {
  if (res.status < 400) {
    if (!hasRetried(request)) return res;
    const ok = new Response(res.body, res);
    ok.headers.append("set-cookie", retryCookie(0));
    return ok;
  }
  const reason = refusalReason(await res.text());
  console.warn(`sign-in callback refused: ${reason}${hasRetried(request) ? " (after retry)" : ""}`);
  const headers = new Headers({ "cache-control": "no-store" });
  for (const c of res.headers.getSetCookie()) headers.append("set-cookie", c);
  if (RETRYABLE.has(reason) && !hasRetried(request)) {
    headers.append("set-cookie", retryCookie(RETRY_TTL));
    headers.set("location", "/auth/login");
    return new Response(null, { status: 302, headers });
  }
  headers.append("set-cookie", retryCookie(0));
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(page(reason), { status: res.status, headers });
}
