import { currentUser } from "./session.server";
import { setting } from "./runtime";

/**
 * Optional whole-site sign-in wall. With HUB_REQUIRE_SIGN_IN=true every page
 * and API needs a session, not just the member areas; used while the Hub is a
 * private preview. Leave it unset to keep the public pages (home, family
 * guide, public fundraiser pages) open to everyone.
 */
const ALWAYS_OPEN = ["/auth/", "/robots.txt", "/favicon"];

export async function siteGateResponse(request: Request): Promise<Response | null> {
  if (setting("HUB_REQUIRE_SIGN_IN", { optional: true }) !== "true") return null;
  const url = new URL(request.url);
  if (ALWAYS_OPEN.some((p) => url.pathname.startsWith(p))) return null;
  if (await currentUser(request).catch(() => null)) return null;

  const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) {
    const login = new URL("/auth/login", url);
    login.searchParams.set("returnTo", `${url.pathname}${url.search}`);
    return Response.redirect(login.toString(), 302);
  }
  return Response.json({ message: "Sign in required" }, { status: 401 });
}
